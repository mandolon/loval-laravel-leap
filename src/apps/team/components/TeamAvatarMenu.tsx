import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getAvatarColor, getAvatarInitials } from '@/utils/avatarUtils';

export function TeamAvatarMenu() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useUser();

  const handleLogout = async () => {
    try {
      setOpen(false);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Account menu"
          className={`group cursor-pointer inline-flex items-center gap-1 h-8 rounded-full px-1.5 transition-all duration-200 ease-out bg-white/0 hover:bg-neutral-200/80 focus:bg-neutral-200/80 ${open ? 'bg-neutral-200/80' : ''}`}
        >
          <div
            className="h-6 w-6 rounded-full text-white grid place-items-center text-[11px] font-semibold shadow-sm"
            style={{ background: user ? getAvatarColor(user) : undefined }}
            title="Account"
          >
            {user ? getAvatarInitials(user.name) : 'A'}
          </div>
          <span className={`p-1 rounded-full transition-all duration-200 ease-out hover:bg-neutral-300/80 ${open ? 'bg-neutral-300/80' : ''}`}>
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-neutral-700 transition hover:text-neutral-800"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-0 bg-white border border-slate-200 shadow-lg rounded-lg z-[100]" 
        align="end"
        sideOffset={8}
      >
        <div className="py-1">
          {user?.name && (
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
