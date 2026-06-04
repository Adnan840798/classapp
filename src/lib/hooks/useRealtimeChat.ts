'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, Profile } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function useRealtimeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const profilesCache = useRef<Record<string, Pick<Profile, 'full_name' | 'profile_pic_url' | 'role'>>>({});
  const supabase = getSupabaseBrowserClient();

  // Load user profile (from cache or Supabase)
  async function getUserProfile(userId: string) {
    if (profilesCache.current[userId]) {
      return profilesCache.current[userId];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, profile_pic_url, role')
      .eq('id', userId)
      .single();

    if (!error && data) {
      profilesCache.current[userId] = data;
      return data;
    }
    return { full_name: 'Unknown Student', profile_pic_url: null, role: 'student' as const };
  }

  // Load initial messages
  useEffect(() => {
    async function loadInitialMessages() {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            user:profiles!user_id(full_name, profile_pic_url, role)
          `)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!error && data) {
          // Pre-populate profiles cache
          data.forEach((msg: any) => {
            if (msg.user_id && msg.user) {
              profilesCache.current[msg.user_id] = msg.user;
            }
          });
          setMessages(data as unknown as ChatMessage[]);
        }
      } catch (err) {
        console.error('Failed to load chat messages:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialMessages();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            
            // Get profile details (asynchronously)
            const userProfile = await getUserProfile(newMsg.user_id);
            const enrichedMsg: ChatMessage = {
              ...newMsg,
              user: userProfile,
            };

            setMessages((prev) => {
              // Deduplicate just in case
              if (prev.some((m) => m.id === enrichedMsg.id)) return prev;
              return [...prev, enrichedMsg];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            const userProfile = await getUserProfile(updatedMsg.user_id);
            const enrichedMsg: ChatMessage = {
              ...updatedMsg,
              user: userProfile,
            };
            
            setMessages((prev) =>
              prev.map((m) => (m.id === enrichedMsg.id ? enrichedMsg : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Actions
  async function sendMessage(content: string) {
    if (!content.trim() || content.length > 500) return { error: 'Invalid message.' };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { error } = await supabase.from('chat_messages').insert({
      content,
      user_id: user.id,
    });

    if (error) return { error: error.message };
    return { success: true };
  }

  async function togglePin(messageId: string, isPinned: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { error } = await supabase
      .from('chat_messages')
      .update({
        is_pinned: !isPinned,
        pinned_by: !isPinned ? user.id : null,
      })
      .eq('id', messageId);

    if (error) return { error: error.message };
    return { success: true };
  }

  async function deleteMessage(messageId: string) {
    const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
    if (error) return { error: error.message };
    return { success: true };
  }

  return {
    messages,
    loading,
    sendMessage,
    togglePin,
    deleteMessage,
  };
}
