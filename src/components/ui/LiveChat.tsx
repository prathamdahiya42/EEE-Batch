'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/lib/types';

// Avatar color generator based on name hash
function getAvatarColor(name: string): { bg: string; text: string; border: string } {
  const colors = [
    { bg: 'bg-[#FF4F9A]/15', text: 'text-[#C2185B]', border: 'border-[#FF4F9A]/30' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Relative time formatter
function formatChatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSecs < 45) return 'Just now';
    if (diffSecs < 3600) {
      const mins = Math.floor(diffSecs / 60);
      return `${mins}m ago`;
    }
    if (diffSecs < 86400) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Date divider label helper
function getDateDivider(dateString: string): string {
  try {
    const d = new Date(dateString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const NICKNAME_SUGGESTIONS = [
  'Volt Explorer',
  'Circuit Wizard',
  'Electron 42',
  'Ohm Seeker',
  'Flux Master',
  'Power Surge',
  'Sparky EX',
  'Batchmate',
];

export default function LiveChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load display name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('eee_chat_display_name');
    if (savedName && savedName.trim()) {
      setDisplayName(savedName.trim());
    } else {
      setIsEditingName(true);
    }
  }, []);

  // 2. Scroll helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
      setHasUnreadBelow(false);
    }
  }, []);

  // Track scroll position
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceToBottom < 120;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setHasUnreadBelow(false);
    }
  };

  // 3. Supabase Realtime Subscription & Initial Fetch
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function fetchInitialMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) {
          console.warn('Could not fetch initial chat messages:', error.message);
        } else if (data && isMounted) {
          setMessages(data as ChatMessage[]);
          // Scroll to bottom once on initial load
          setTimeout(() => scrollToBottom(false), 150);
        }
      } catch (err) {
        console.warn('Error connecting to Supabase chat:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInitialMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (!isMounted) return;
          const newMsg = payload.new as ChatMessage;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Auto-scroll logic: if user is near bottom or sent it themselves
          if (isNearBottomRef.current || newMsg.sender_name === displayName) {
            setTimeout(() => scrollToBottom(true), 60);
          } else {
            setHasUnreadBelow(true);
          }
        }
      )
      .subscribe((status) => {
        if (isMounted) {
          setIsConnected(status === 'SUBSCRIBED');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [displayName, scrollToBottom]);

  // 4. Save / Update display name
  const handleSaveName = (nameToSave: string) => {
    const trimmed = nameToSave.trim();
    if (!trimmed) return;
    const cleanName = trimmed.slice(0, 30);
    localStorage.setItem('eee_chat_display_name', cleanName);
    setDisplayName(cleanName);
    setIsEditingName(false);
    setTempName('');
  };

  // 5. Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const content = newMessage.trim();
    if (!content || isSending || cooldownRemaining > 0) return;

    if (!displayName.trim()) {
      setIsEditingName(true);
      return;
    }

    setIsSending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('messages').insert({
        content: content.slice(0, 300),
        sender_name: displayName,
      });

      if (error) {
        throw error;
      }

      setNewMessage('');

      // Start 2-second rate-limit cooldown
      setCooldownRemaining(2);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Smooth scroll down
      setTimeout(() => scrollToBottom(true), 60);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please ensure the Supabase messages table is created.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[820px] min-h-[480px] w-full max-w-3xl mx-auto glass-card border border-[#FFD9E8] shadow-xl overflow-hidden relative">
      {/* ============================================
          1. Header with Realtime Indicator & Name Badge
          ============================================ */}
      <div className="px-4 py-3 bg-white/70 backdrop-blur-md border-b border-[#FFD9E8]/80 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-amber-400'
              }`}
            />
            {isConnected && (
              <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold text-[#3D2C36] leading-tight">
                Batch Public Chat
              </h2>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-[#FF4F9A]/10 text-[#C2185B] font-semibold">
                Live ⚡
              </span>
            </div>
            <p className="text-[11px] text-[#3D2C36]/60 font-medium">
              {isConnected ? 'Connected in real-time' : 'Connecting to pulse...'}
            </p>
          </div>
        </div>

        {/* Display Name Badge / Edit trigger */}
        <div className="flex items-center gap-1.5">
          {displayName ? (
            <button
              type="button"
              onClick={() => {
                setTempName(displayName);
                setIsEditingName(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-[#FFD9E8] hover:border-[#FF4F9A] text-xs text-[#3D2C36] transition-all hover:bg-white shadow-2xs cursor-pointer group"
              title="Click to change your display name"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF4F9A]" />
              <span className="font-display font-semibold max-w-[120px] truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-[#FF4F9A] group-hover:underline">✏️</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="px-3 py-1 rounded-full bg-[#FF4F9A] text-white text-xs font-display font-bold shadow-xs hover:bg-[#E0297A] transition-all cursor-pointer"
            >
              Set Nickname
            </button>
          )}
        </div>
      </div>

      {/* ============================================
          2. Messages List Area
          ============================================ */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-gradient-to-b from-white/30 via-transparent to-white/20 scroll-smooth"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-[#3D2C36]/60 gap-3">
            <span className="w-6 h-6 border-2 border-[#FF4F9A]/40 border-t-[#FF4F9A] rounded-full animate-spin" />
            <span className="font-mono text-xs tracking-wide">Syncing live batch chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-14 h-14 rounded-3xl bg-white/80 border border-[#FFD9E8] shadow-sm flex items-center justify-center text-2xl mb-3 animate-bounce">
              💬
            </div>
            <h3 className="font-display font-bold text-base text-[#3D2C36]">
              No messages yet!
            </h3>
            <p className="text-xs text-[#3D2C36]/70 max-w-xs mt-1">
              Be the first to say hello to the EEE batch. Messages appear live for everyone.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = displayName && msg.sender_name.trim().toLowerCase() === displayName.trim().toLowerCase();
            const avatar = getAvatarColor(msg.sender_name);
            const showDateDivider =
              index === 0 ||
              new Date(msg.created_at).toDateString() !==
                new Date(messages[index - 1].created_at).toDateString();

            return (
              <div key={msg.id || `${msg.sender_name}-${msg.created_at}-${index}`}>
                {/* Date Divider */}
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#C2185B]/70 bg-white/70 border border-[#FFD9E8] px-3 py-0.5 rounded-full shadow-2xs backdrop-blur-xs">
                      {getDateDivider(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Chat Bubble Row */}
                <div
                  className={`flex items-end gap-2 animate-fade-up ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Left Avatar (for other users) */}
                  {!isMe && (
                    <div
                      className={`w-7 h-7 rounded-full border ${avatar.border} ${avatar.bg} ${avatar.text} flex items-center justify-center text-[10px] font-bold font-display shrink-0 shadow-2xs`}
                      title={msg.sender_name}
                    >
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className={`max-w-[78%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name (for other users) */}
                    {!isMe && (
                      <span className="font-display text-[11px] font-bold text-[#C2185B] mb-0.5 ml-1">
                        {msg.sender_name}
                      </span>
                    )}

                    {/* Bubble Content */}
                    <div
                      className={`px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? 'bg-gradient-to-br from-[#FF4F9A] to-[#E0297A] text-white rounded-2xl rounded-tr-xs shadow-md shadow-[#FF4F9A]/20'
                          : 'bg-white/90 text-[#3D2C36] border border-[#FFD9E8] rounded-2xl rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] font-mono text-[#3D2C36]/50 mt-1 px-1">
                      {formatChatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating "New Messages ↓" Pill Button */}
      {hasUnreadBelow && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-[#FF4F9A] text-white font-display text-xs font-bold shadow-lg shadow-[#FF4F9A]/30 hover:bg-[#E0297A] transition-all animate-bounce cursor-pointer flex items-center gap-1.5"
        >
          <span>↓</span>
          <span>New messages</span>
        </button>
      )}

      {/* ============================================
          3. Sticky Bottom Message Input Bar
          ============================================ */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 sm:p-4 bg-white/80 backdrop-blur-lg border-t border-[#FFD9E8] z-10 shrink-0"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                displayName
                  ? `Message as ${displayName}...`
                  : 'Type a message...'
              }
              maxLength={300}
              disabled={isSending}
              className="w-full pl-4 pr-16 py-2.5 sm:py-3 glass-input text-xs sm:text-sm text-[#3D2C36] placeholder-[#3D2C36]/40 rounded-full border border-[#FFD9E8] focus:border-[#FF4F9A] focus:ring-2 focus:ring-[#FF4F9A]/20 transition-all font-medium"
            />
            {/* Live Character Counter */}
            <span
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] pointer-events-none transition-colors ${
                newMessage.length > 270
                  ? 'text-rose-600 font-bold'
                  : 'text-[#3D2C36]/40'
              }`}
            >
              {newMessage.length}/300
            </span>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || cooldownRemaining > 0}
            className="px-4 sm:px-5 py-2.5 sm:py-3 glass-btn-primary font-display text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-all active:scale-95"
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : cooldownRemaining > 0 ? (
              <span className="font-mono text-xs">{cooldownRemaining}s</span>
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <span className="text-sm sm:text-base">🚀</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ============================================
          4. Display Name Modal / Onboarding Prompt
          ============================================ */}
      {isEditingName && (
        <div className="absolute inset-0 z-30 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-up">
          <div className="w-full max-w-sm glass-card p-6 bg-white/95 border-2 border-[#FFD9E8] shadow-2xl rounded-3xl">
            <div className="text-center mb-4">
              <span className="w-12 h-12 rounded-2xl bg-[#FF4F9A]/15 border border-[#FF4F9A]/30 flex items-center justify-center text-2xl mx-auto mb-2">
                👋
              </span>
              <h3 className="font-display font-bold text-base text-[#3D2C36]">
                {displayName ? 'Change Display Name' : 'Welcome to Batch Chat!'}
              </h3>
              <p className="text-xs text-[#3D2C36]/70 mt-1">
                No login required. Choose a nickname to start chatting live with your batchmates.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveName(tempName || displayName);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-[#C2185B] mb-1">
                  Your Nickname / Display Name
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. Pratham, Circuit Wizard"
                  maxLength={30}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 glass-input text-sm text-[#3D2C36] placeholder-[#3D2C36]/40 rounded-2xl border border-[#FFD9E8] focus:border-[#FF4F9A]"
                />
              </div>

              {/* Quick suggestion pills */}
              <div>
                <span className="block font-mono text-[9px] uppercase font-bold text-[#3D2C36]/50 mb-1.5">
                  Or pick a suggestion:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {NICKNAME_SUGGESTIONS.slice(0, 4).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setTempName(sugg)}
                      className="px-2.5 py-1 rounded-full bg-white border border-[#FFD9E8] text-[11px] font-medium text-[#3D2C36]/80 hover:border-[#FF4F9A] hover:text-[#FF4F9A] transition-all cursor-pointer"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!tempName.trim() && !displayName}
                  className="flex-1 py-2.5 glass-btn-primary font-display text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Join Chat ⚡
                </button>
                {displayName && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setTempName('');
                    }}
                    className="px-3 py-2.5 text-xs text-[#3D2C36]/70 hover:text-[#3D2C36] font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
