'use client';

import { useState, useEffect, useRef } from 'react';
import { Notification } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useProfile } from '@/context/ProfileContext';
import { playNotificationChime } from '@/lib/utils/audio';

export function useNotifications() {
  const { profile, setProfile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = getSupabaseBrowserClient();

  // Helper to play sound if enabled
  const playSound = () => {
    if (profile?.notif_sound_on && profile?.notif_enabled) {
      playNotificationChime();
    }
  };

  // Load initial notifications
  useEffect(() => {
    if (!profile?.id) return;

    async function loadNotifications() {
      // Fetch user's consolidated notifications (Regular + CR/Admin if applicable) in a single DB query!
      const { data, error } = await supabase
        .from('my_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Failed to load notifications:', error);
        return;
      }

      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);

        // Pruning check: delete regular notifications beyond the latest 15 for this user
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
    }

    loadNotifications();
  }, [profile?.id, profile?.cr_last_read_at]);

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return;

    // Regular notification channel
    const regularChannel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload: any) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            const updated = [newNotif, ...prev]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 30);
            return updated;
          });
          setUnreadCount((count) => count + 1);
          playSound();
        }
      )
      .subscribe();

    // CR/Admin realtime channels
    let qnaChannel: any;
    let notesChannel: any;

    if (profile.role === 'cr' || profile.role === 'admin') {
      // Listen to timeline_questions table
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
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new.is_resolved === true) {
                setNotifications((prev) => {
                  const updated = prev.filter((n) => !(['qna', 'qna_announcement', 'qna_deadline', 'qna_event'].includes(n.type) && n.id === payload.new.id));
                  setUnreadCount(updated.filter((n) => !n.is_read).length);
                  return updated;
                });
              }
            }
          }
        )
        .subscribe();

      // Listen to notes table
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
              }
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new.is_pending === false) {
                setNotifications((prev) => {
                  const updated = prev.filter((n) => !(n.type === 'resource_pending' && n.reference_id === payload.new.id));
                  setUnreadCount(updated.filter((n) => !n.is_read).length);
                  return updated;
                });
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
  }, [profile?.id, profile?.role, profile?.notif_sound_on, profile?.notif_enabled]);

  async function markAllRead() {
    if (!profile?.id || unreadCount === 0) return;

    // 1. Mark regular notifications read in DB
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    // 2. If CR/Admin, update cr_last_read_at in profiles table in DB
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

  return {
    notifications,
    unreadCount,
    markAllRead,
  };
}
