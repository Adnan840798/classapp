'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Notification } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useProfile } from '@/context/ProfileContext';
import { playNotificationChime } from '@/lib/utils/audio';
import { bulkDeleteNotifications } from '@/lib/actions/notifications';

export interface InAppPopup {
  id: string;
  title: string;
  message: string;
  type: Notification['type'];
  reference_id: string | null;
  created_at: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  activePopups: InAppPopup[];
  dismissPopup: (id: string) => void;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<{ success?: boolean; error?: string }>;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile, setProfile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activePopups, setActivePopups] = useState<InAppPopup[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseBrowserClient();

  // Helper to play sound if enabled
  const playSound = () => {
    if (profile?.notif_enabled) {
      playNotificationChime();
    }
  };

  // Helper to spawn in-app popup
  const triggerPopup = (notif: { id: string; title: string; message: string; type: Notification['type']; reference_id: string | null; created_at: string }) => {
    if (profile?.notif_enabled) {
      const newPopup: InAppPopup = {
        id: notif.id || String(Date.now() + Math.random()),
        title: notif.title,
        message: notif.message,
        type: notif.type,
        reference_id: notif.reference_id,
        created_at: notif.created_at,
      };
      // Prepend to stack so newer ones stack at the bottom or top depending on render direction
      setActivePopups((prev) => [newPopup, ...prev]);
    }
  };

  // Refresh notifications function
  const refreshNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('my_notifications')
        .select('id, type, title, message, reference_id, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Failed to load notifications:', error);
        return;
      }

      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);

        // Pruning check
        const regularNotifs = data.filter((n: any) => 
          ['announcement', 'deadline', 'result', 'system'].includes(n.type)
        );
        if (regularNotifs.length > 15) {
          const obsoleteIds = regularNotifs.slice(15).map((n: any) => n.id);
          supabase
            .from('notifications')
            .delete()
            .in('id', obsoleteIds)
            .then((res: any) => {
              if (res.error) console.error('Failed to prune database notifications:', res.error);
            });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.id, supabase]);

  // Load initial notifications
  useEffect(() => {
    refreshNotifications();
  }, [profile?.id, refreshNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return;

    // Regular notification channel (listening to all events: INSERT, UPDATE, DELETE)
    const regularChannel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => {
              const updated = [newNotif, ...prev]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 30);
              return updated;
            });
            setUnreadCount((count) => count + 1);
            playSound();
            triggerPopup(newNotif);
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            setNotifications((prev) => {
              const next = prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n));
              setUnreadCount(next.filter((n) => !n.is_read).length);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setNotifications((prev) => {
              const next = prev.filter((n) => n.id !== deletedId);
              setUnreadCount(next.filter((n) => !n.is_read).length);
              return next;
            });
          }
        }
      )
      .subscribe((status: string) => {
        console.log(`[NotificationContext] Realtime subscription status for notifications:${profile.id}:`, status);
      });

    // CR/Admin realtime channels
    let qnaChannel: any;
    let notesChannel: any;

    if (profile.role === 'cr' || profile.role === 'admin') {
      qnaChannel = supabase
        .channel('cr-qna-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'timeline_questions',
          },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              let qnaType = 'qna_event';
              let refId = payload.new.event_id;
              if (payload.new.announcement_id) {
                qnaType = 'qna_announcement';
                refId = payload.new.announcement_id;
              } else if (payload.new.deadline_id) {
                qnaType = 'qna_deadline';
                refId = payload.new.deadline_id;
              }

              const newNotif: Notification = {
                id: payload.new.id,
                user_id: profile.id,
                title: 'New Student Question',
                message: payload.new.question,
                type: qnaType as any,
                is_read: false,
                reference_id: refId,
                created_at: payload.new.created_at,
              };
              setNotifications((prev) => {
                const updated = [newNotif, ...prev]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 30);
                return updated;
              });
              setUnreadCount((count) => count + 1);
              playSound();
              triggerPopup(newNotif);
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new.is_resolved === true) {
                setNotifications((prev) => {
                  const updated = prev.filter((n) => !(['qna', 'qna_announcement', 'qna_deadline', 'qna_event'].includes(n.type) && n.id === payload.new.id));
                  setUnreadCount(updated.filter((n) => !n.is_read).length);
                  return updated;
                });
                setActivePopups((prev) => prev.filter((p) => p.id !== payload.new.id));
              } else {
                // A question comment was edited!
                setNotifications((prev) =>
                  prev.map((n) =>
                    ['qna', 'qna_announcement', 'qna_deadline', 'qna_event'].includes(n.type) && n.id === payload.new.id
                      ? { ...n, message: payload.new.question }
                      : n
                  )
                );
              }
            }
          }
        )
        .subscribe();

      notesChannel = supabase
        .channel('cr-notes-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
          },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              if (payload.new.is_pending === true) {
                const newNotif: Notification = {
                  id: payload.new.id,
                  user_id: profile.id,
                  title: 'Resource Pending Review',
                  message: payload.new.title,
                  type: 'resource_pending',
                  is_read: false,
                  reference_id: payload.new.id,
                  created_at: payload.new.created_at,
                };
                setNotifications((prev) => {
                  const updated = [newNotif, ...prev]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 30);
                  return updated;
                });
                setUnreadCount((count) => count + 1);
                playSound();
                triggerPopup(newNotif);
              }
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new.is_pending === false) {
                setNotifications((prev) => {
                  const updated = prev.filter((n) => !(n.type === 'resource_pending' && n.reference_id === payload.new.id));
                  setUnreadCount(updated.filter((n) => !n.is_read).length);
                  return updated;
                });
                setActivePopups((prev) => prev.filter((p) => p.id !== payload.new.id));
              }
            }
          }
        )
        .subscribe();
    }


    return () => {
      supabase.removeChannel(regularChannel);
      if (qnaChannel) supabase.removeChannel(qnaChannel);
      if (notesChannel) supabase.removeChannel(notesChannel);
    };
  }, [profile?.id, profile?.role, profile?.notif_enabled]);

  // Listen for native foreground notification events to show them in-app
  useEffect(() => {
    if (!profile?.id) return;

    const handleForegroundNotif = (e: Event) => {
      const customEvent = e as CustomEvent;
      const notification = customEvent.detail;
      
      triggerPopup({
        id: notification.id || String(Date.now() + Math.random()),
        title: notification.title || 'Academic Update',
        message: notification.body || '',
        type: (notification.data?.type || 'system') as any,
        reference_id: notification.data?.reference_id || null,
        created_at: new Date().toISOString(),
      });
    };

    window.addEventListener('foreground-notification', handleForegroundNotif);
    return () => {
      window.removeEventListener('foreground-notification', handleForegroundNotif);
    };
  }, [profile?.id]);

  async function markAllRead() {
    if (!profile?.id || unreadCount === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    if (profile.role === 'cr' || profile.role === 'admin') {
      const nowStr = new Date().toISOString();
      await supabase
        .from('profiles')
        .update({ cr_last_read_at: nowStr })
        .eq('id', profile.id);
      
      setProfile({
        ...profile,
        cr_last_read_at: nowStr,
      });
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function deleteNotifications(ids: string[]) {
    if (!ids || ids.length === 0) return { success: true };

    // Optimistically update UI
    setNotifications((prev) => {
      const next = prev.filter((n) => !ids.includes(n.id));
      setUnreadCount(next.filter((n) => !n.is_read).length);
      return next;
    });

    const res = await bulkDeleteNotifications(ids);
    if (res && res.error) {
      console.error('[deleteNotifications] Error during server deletion:', res.error);
      refreshNotifications(); // Revert to database state if failed
      return { error: res.error };
    }
    return { success: true };
  }

  function dismissPopup(id: string) {
    setActivePopups((prev) => prev.filter((p) => p.id !== id));
  }


  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        activePopups,
        dismissPopup,
        loading,
        refreshNotifications,
        deleteNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
