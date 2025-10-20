import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Send, X, MoreVertical, Trash2, Reply } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const T = {
  radius: 'rounded-[8px]',
  radiusSmall: 'rounded-[6px]',
  text: 'text-[12px]',
  focus: 'focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40',
};

interface MockMessage {
  id: string;
  userId: string;
  content: string;
  replyToMessageId?: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

interface SandboxChatPanelProps {
  onClose: () => void;
  className?: string;
}

const INITIAL_MESSAGES: MockMessage[] = [
  {
    id: '1',
    userId: 'user1',
    content: 'Welcome to the project chat!',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    user: {
      name: 'System',
      avatarUrl: undefined,
    },
  },
  {
    id: '2',
    userId: 'user2',
    content: 'Thanks! This looks great.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    user: {
      name: 'John Doe',
      avatarUrl: undefined,
    },
  },
  {
    id: '3',
    userId: 'user3',
    content: 'Can we review the latest design changes?',
    createdAt: new Date(Date.now() - 900000).toISOString(),
    user: {
      name: 'Jane Smith',
      avatarUrl: undefined,
    },
  },
];

export function SandboxChatPanel({ onClose, className = '' }: SandboxChatPanelProps) {
  const [messages, setMessages] = useState<MockMessage[]>(INITIAL_MESSAGES);
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<MockMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim()) {
      const newMessage: MockMessage = {
        id: Date.now().toString(),
        userId: 'current-user',
        content: message.trim(),
        replyToMessageId: replyingTo?.id,
        createdAt: new Date().toISOString(),
        user: {
          name: 'You',
          avatarUrl: undefined,
        },
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessage('');
      setReplyingTo(null);
    }
  };

  const handleDelete = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#0F1219] dark:bg-[#0F1219] border-l border-[#1d2230]/60 dark:border-[#1d2230]/60 ${T.radius} h-full max-h-full overflow-hidden ${className}`}
      role="complementary"
      aria-label="Project chat"
    >
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#1d2230] dark:border-[#1d2230] bg-[#0E1118] dark:bg-[#0E1118] flex-shrink-0">
        <span className={`${T.text} text-neutral-300 dark:text-neutral-300`}>Project Chat</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse chat"
          className={`h-7 w-7 grid place-items-center border border-[#283046]/60 dark:border-[#283046]/60 ${T.radiusSmall} text-neutral-400 dark:text-neutral-400 hover:bg-[#161B26] dark:hover:bg-[#161B26] ${T.focus}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 group ${msg.replyToMessageId ? 'ml-8' : ''}`}>
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback
                className="text-white text-[10px] font-semibold"
                style={{
                  background: msg.user.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)',
                }}
              >
                {msg.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className={`font-medium ${T.text} text-neutral-200 dark:text-neutral-200`}>
                  {msg.user.name}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-500">
                  {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>

              <div className={`bg-[#141C28] dark:bg-[#141C28] border border-[#1a2030]/60 dark:border-[#1a2030]/60 p-2 ${T.radiusSmall} max-w-[85%]`}>
                <p className={`${T.text} text-neutral-300 dark:text-neutral-300 whitespace-pre-wrap break-words`}>{msg.content}</p>
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {!msg.replyToMessageId && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(msg)}
                    className={`px-2 py-0.5 text-[10px] text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] ${T.radiusSmall} ${T.focus}`}
                  >
                    <Reply className="h-3 w-3 inline mr-1" />
                    Reply
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`h-6 w-6 grid place-items-center text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] ${T.radiusSmall} ${T.focus}`}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#0E1118] border-[#1d2230]">
                    <DropdownMenuItem
                      onClick={() => handleDelete(msg.id)}
                      className="text-neutral-300 hover:bg-[#141C28] hover:text-red-400 focus:bg-[#141C28] focus:text-red-400"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-[#1d2230] dark:border-[#1d2230] bg-[#0E1118] dark:bg-[#0E1118] flex-shrink-0">
        {replyingTo && (
          <div className="px-2 pt-2 flex items-center justify-between">
            <div className={`flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-400`}>
              <span>Replying to</span>
              <span className="font-medium text-neutral-300 dark:text-neutral-300">{replyingTo.user.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className={`h-5 w-5 grid place-items-center text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] ${T.radiusSmall} ${T.focus}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <form className="px-2 py-2 grid grid-cols-[1fr_auto] gap-2" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className={`h-8 px-2 py-1 bg-[#0E1118] dark:bg-[#0E1118] border border-[#283046]/60 dark:border-[#283046]/60 ${T.radiusSmall} ${T.text} text-neutral-200 dark:text-neutral-200 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 resize-none ${T.focus}`}
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className={`h-8 px-3 border border-[#283046]/60 dark:border-[#283046]/60 ${T.radiusSmall} ${T.text} text-neutral-300 dark:text-neutral-300 hover:bg-[#161B26] dark:hover:bg-[#161B26] disabled:opacity-50 disabled:cursor-not-allowed ${T.focus}`}
          >
            <Send className="h-3 w-3" />
          </button>
        </form>
      </div>
    </div>
  );
}
