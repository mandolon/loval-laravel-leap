import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function TeamAvatarMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  const getInitials = () => {
    if (!user?.name) return 'A';
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setOpen(false);
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Account menu"
          className="group cursor-pointer inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] transition ring-1 ring-transparent hover:bg-slate-100 hover:ring-slate-200"
        >
          <div
            className="h-6 w-6 rounded-full bg-slate-900 text-white grid place-items-center text-[11px] font-semibold shadow-sm"
            title="Account"
          >
            {getInitials()}
          </div>
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-600 transition group-hover:text-slate-700"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
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
