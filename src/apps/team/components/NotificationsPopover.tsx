/**
 * NotificationsPopover Component
 * Popup that displays all notifications for the user with semantic rendering
 */

import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/lib/api/hooks/useNotifications';
import { Notification, NotificationEventType } from '@/lib/api/types';
import { MessageCircle, CheckCircle2, FileText, Inbox } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface NotificationsPopoverProps {
  children: React.ReactNode;
}

// Helper function to format timestamps
const formatWhen = (s: string) => {
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return s;

  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const diffSec = diffMs / 1000;

  if (diffSec < 0) {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (dt.getFullYear() !== now.getFullYear()) {
      opts.year = "numeric";
    }
    return dt.toLocaleDateString(undefined, opts);
  }

  if (diffSec < 60) return "Just now";

  const diffMin = diffSec / 60;
  if (diffMin < 3) return "a few mins ago";

  const diffHr = diffMin / 60;
  if (diffHr < 1) return "a few mins ago";
  if (diffHr < 2) return "about an hour ago";
  if (diffHr < 6) return "a few hours ago";

  const diffDay = diffHr / 24;
  if (diffDay < 2) return "yesterday";
  if (diffDay < 7) return "a few days ago";
  if (diffDay < 14) return "last week";

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (dt.getFullYear() !== now.getFullYear()) {
    opts.year = "numeric";
  }
  return dt.toLocaleDateString(undefined, opts);
};

// Get the appropriate icon for each notification type
const getNotificationIcon = (kind: string) => {
  const iconProps = {
    size: 16,
    className: "text-slate-600",
    strokeWidth: 2.5,
  };

  switch (kind) {
    case NotificationEventType.WORKSPACE_CHAT_MESSAGE:
    case NotificationEventType.PROJECT_CHAT_MESSAGE:
      return <MessageCircle {...iconProps} />;
    case NotificationEventType.TASK_ASSIGNED:
      return <CheckCircle2 {...iconProps} />;
    case NotificationEventType.FILE_ADDED:
    case NotificationEventType.MODEL_ADDED:
      return <FileText {...iconProps} />;
    case NotificationEventType.REQUEST_CREATED:
      return <Inbox {...iconProps} />;
    default:
      return null;
  }
};

// Semantic notification title component
interface NotificationTitleProps {
  notification: Notification;
}

const NotificationTitle = ({ notification }: NotificationTitleProps) => {
  const { type, metadata } = notification;
  const actorName = (metadata as any)?.actorName || 'Someone';

  const renderAction = () => {
    switch (type) {
      case NotificationEventType.WORKSPACE_CHAT_MESSAGE:
        return (
          <>
            <span className="font-normal">posted in </span>
            <span className="font-normal text-sky-600 underline underline-offset-2">
              {(metadata as any)?.workspaceName || 'Workspace'}
            </span>
          </>
        );

      case NotificationEventType.PROJECT_CHAT_MESSAGE:
        return (
          <>
            <span className="font-normal">posted in </span>
            <span className="font-normal text-sky-600 underline underline-offset-2">
              {(metadata as any)?.projectName || 'Project'}
            </span>
          </>
        );

      case NotificationEventType.TASK_ASSIGNED:
        return (
          <>
            <span className="font-normal">assigned </span>
            <span className="font-semibold">you</span>
            <span className="font-normal"> a </span>
            <span className="font-normal text-sky-600 underline underline-offset-2">
              Task
            </span>
          </>
        );

      case NotificationEventType.FILE_ADDED:
      case NotificationEventType.MODEL_ADDED:
        return (
          <>
            <span className="font-normal">added files to </span>
            <span className="font-normal text-sky-600 underline underline-offset-2">
              {(metadata as any)?.projectName || 'Project'}
            </span>
          </>
        );

      case NotificationEventType.REQUEST_CREATED:
        return (
          <>
            <span className="font-normal">sent you a </span>
            <span className="font-normal text-sky-600 underline underline-offset-2">
              Request
            </span>
          </>
        );

      default:
        // Fallback to using the notification title
        return <span className="font-normal">{notification.title}</span>;
    }
  };

  return (
    <p className="text-sm text-slate-900 truncate">
      <span className="font-semibold">{actorName}</span> {renderAction()}
    </p>
  );
};

// Extract preview text based on notification type
const getPreviewText = (notification: Notification) => {
  const { type, metadata, content } = notification;

  switch (type) {
    case NotificationEventType.WORKSPACE_CHAT_MESSAGE:
    case NotificationEventType.PROJECT_CHAT_MESSAGE:
      return (metadata as any)?.messagePreview || content || '';

    case NotificationEventType.TASK_ASSIGNED:
      return (metadata as any)?.taskTitle || content || '';

    case NotificationEventType.FILE_ADDED:
      const fileName = (metadata as any)?.fileName || '';
      const fileCount = (metadata as any)?.fileCount || 1;
      const fileCountText =
        fileCount > 1
          ? ` +${fileCount - 1} other ${fileCount - 1 === 1 ? "file" : "files"}`
          : "";
      return `${fileName}${fileCountText}`;

    case NotificationEventType.MODEL_ADDED:
      return (metadata as any)?.modelName || content || '';

    case NotificationEventType.REQUEST_CREATED:
      return (metadata as any)?.requestTitle || content || '';

    default:
      return content || '';
  }
};

// Individual notification item component
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
  return (
    <li
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-b-0"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <NotificationTitle notification={notification} />
        <p className="mt-1 text-xs text-slate-500 truncate max-w-sm">
          {getPreviewText(notification)}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {formatWhen(notification.createdAt)}
        </p>
      </div>

      {!notification.isRead && (
        <div className="flex-shrink-0 mt-1">
          <span className="block h-2 w-2 rounded-full bg-sky-500" />
        </div>
      )}
    </li>
  );
};

// Main NotificationsPopover component
export function NotificationsPopover({ children }: NotificationsPopoverProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [open, setOpen] = useState(false);

  const { data: notifications, isLoading } = useNotifications(user?.id || '');
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // Filter notifications based on selected filter
  const filteredNotifications = notifications?.filter(notification => {
    if (filter === 'unread') {
      return !notification.isRead;
    }
    return true;
  }) || [];

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead && user?.id) {
      markAsReadMutation.mutate({ id: notification.id, userId: user.id });
    }

    // Navigate to the action URL if available
    if (notification.actionUrl) {
      setOpen(false);
      navigate(notification.actionUrl);
    }
  };

  const handleClearAll = () => {
    if (user?.id) {
      markAllAsReadMutation.mutate(user.id);
      setFilter('all');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[420px] p-0 bg-white border border-slate-200 shadow-lg rounded-2xl"
        align="end"
        sideOffset={8}
      >
        {!user ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Please sign in to view notifications</p>
          </div>
        ) : (
          <div className="flex flex-col max-h-[600px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <span className="text-sm font-semibold text-slate-900">
                  Notifications
                </span>
              </div>
              <button className="text-[11px] text-sky-600 hover:text-sky-700 font-medium">
                View all
              </button>
            </div>

            {/* Filter tabs */}
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                  filter === 'unread'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      filter === 'unread'
                        ? 'bg-sky-400'
                        : 'bg-sky-100 text-sky-600'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Notification list */}
            <ul className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <li className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">Loading...</p>
                </li>
              ) : filteredNotifications.length === 0 ? (
                <li className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">
                    {filter === 'unread'
                      ? 'No unread notifications'
                      : 'No notifications'}
                  </p>
                </li>
              ) : (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))
              )}
            </ul>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={handleClearAll}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
