'use client';

import { useState, useEffect, useRef } from 'react';
import { Notification } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useProfile } from '@/context/ProfileContext';

export function useNotifications() {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = getSupabaseBrowserClient();

  // Load initial notifications
  useEffect(() => {
    if (!profile?.id) return;

    async function loadNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        const kept = data.slice(0, 15);
        setNotifications(kept as Notification[]);
        setUnreadCount(kept.filter((n: any) => !n.is_read).length);

        if (data.length > 15) {
          const obsoleteIds = data.slice(15).map((n: any) => n.id);
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
  }, [profile?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
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
            const updated = [newNotif, ...prev];
            if (updated.length > 15) {
              const obsoleteIds = updated.slice(15).map((n) => n.id);
              supabase
                .from('notifications')
                .delete()
                .in('id', obsoleteIds)
                .then((res: any) => {
                  if (res.error) console.error('Failed to prune database notifications in realtime:', res.error);
                });
              return updated.slice(0, 15);
            }
            return updated;
          });
          setUnreadCount((count) => count + 1);

          // Play sound if enabled
          if (profile.notif_sound_on && profile.notif_enabled) {
            if (!audioRef.current) {
              audioRef.current = new Audio('/sounds/notification.mp3');
            }
            audioRef.current.play().catch(() => {
              // Browser may block autoplay — ignore
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.notif_sound_on, profile?.notif_enabled]);

  async function markAllRead() {
    if (!profile?.id || unreadCount === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return {
    notifications,
    unreadCount,
    markAllRead,
  };
}
