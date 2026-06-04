'use client';

import { useState, useEffect, useRef } from 'react';
import { Pin, Trash2, Send, Loader2, PinOff, Megaphone } from 'lucide-react';
import { useRealtimeChat } from '@/lib/hooks/useRealtimeChat';
import { formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useProfile } from '@/context/ProfileContext';

interface ChatWindowProps {
  role: 'student' | 'cr' | 'admin';
}

export function ChatWindow({ role }: ChatWindowProps) {
  const { profile } = useProfile();
  const { messages, loading, sendMessage, togglePin, deleteMessage } = useRealtimeChat();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isCR = role === 'cr' || role === 'admin';

  // Scroll to bottom on load and new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inputText.trim() || inputText.length > 500 || isSending) return;

    setIsSending(true);
    const content = inputText;
    setInputText('');

    try {
      const res = await sendMessage(content);
      if (res && res.error) {
        alert(res.error);
        setInputText(content); // restore content on failure
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  }

  // Filter pinned messages
  const pinnedMessages = messages.filter((m) => m.is_pinned);

  if (loading) {
    return (
      <div className="glass-card h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading chat room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card h-[650px] flex flex-col overflow-hidden relative border border-border">
      {/* Pinned Messages Header */}
      {pinnedMessages.length > 0 && (
        <div className="bg-primary/5 border-b border-primary/20 px-4 py-2.5 flex items-start gap-3 flex-shrink-0 animate-fade-in">
          <Pin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Pinned Announcement</p>
            <p className="text-xs font-semibold text-foreground truncate">
              {pinnedMessages[pinnedMessages.length - 1].content}
            </p>
          </div>
          {isCR && (
            <button
              onClick={() => togglePin(pinnedMessages[pinnedMessages.length - 1].id, true)}
              className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 font-semibold border border-border bg-background hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
            >
              <PinOff className="w-3.5 h-3.5" />
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Megaphone className="w-8 h-8 opacity-30" />
            <p className="text-sm font-semibold">Welcome to the Class Chat!</p>
            <p className="text-xs">Start the conversation by typing below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user_id === profile?.id;
            const msgRole = msg.user?.role ?? 'student';
            const isMsgCR = msgRole === 'cr' || msgRole === 'admin';

            return (
              <div
                key={msg.id}
                className={`chat-message flex items-start justify-between gap-4 p-3 rounded-xl transition-all ${
                  msg.is_pinned ? 'pinned bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <UserAvatar
                    profile={{
                      full_name: msg.user?.full_name || 'Student',
                      profile_pic_url: msg.user?.profile_pic_url || null,
                    }}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isOwnMessage ? 'text-primary' : 'text-foreground'}`}>
                        {msg.user?.full_name || 'Student'}
                      </span>
                      {isMsgCR && (
                        <span className="text-[9px] uppercase font-extrabold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded-md">
                          CR
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1 leading-relaxed break-words pr-2">
                      {msg.content}
                    </p>
                  </div>
                </div>

                {/* Message Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {isCR && (
                    <>
                      <button
                        onClick={() => togglePin(msg.id, msg.is_pinned)}
                        className={`p-1.5 rounded-lg hover:bg-accent ${
                          msg.is_pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={msg.is_pinned ? 'Unpin message' : 'Pin message'}
                      >
                        {msg.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {!isCR && isOwnMessage && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Footer */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-border flex flex-col gap-2 bg-accent/10 flex-shrink-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Send a message to class..."
            maxLength={500}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="form-input flex-1"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim() || inputText.length > 500}
            className="btn-primary py-2.5 px-4 flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Info row with character limit */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <span>Keep it friendly & academic</span>
          <span className={inputText.length > 450 ? 'text-red-400 font-bold' : ''}>
            {inputText.length} / 500
          </span>
        </div>
      </form>
    </div>
  );
}
