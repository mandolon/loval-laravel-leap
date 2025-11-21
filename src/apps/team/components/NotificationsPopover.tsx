/**
 * NotificationsPopover Component
 * Popup that displays all notifications for the user
 */

import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification
} from '@/lib/api/hooks/useNotifications';
import { Notification, NotificationEventType } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2, MessageSquare, FileText, Box, ClipboardList } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface NotificationsPopoverProps {
  children: React.ReactNode;
}

export function NotificationsPopover({ children }: NotificationsPopoverProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [open, setOpen] = useState(false);

  const { data: notifications, isLoading } = useNotifications(user?.id || '');
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // Filter notifications based on selected filter
  const filteredNotifications = notifications?.filter(notification => {
    if (filter === 'unread') {
      return !notification.isRead;
    }
    return true;
  }) || [];

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleMarkAsRead = (notificationId: string) => {
    if (user?.id) {
      markAsReadMutation.mutate({ id: notificationId, userId: user.id });
    }
  };

  const handleMarkAllAsRead = () => {
    if (user?.id) {
      markAllAsReadMutation.mutate(user.id);
    }
  };

  const handleDelete = (notificationId: string) => {
    if (user?.id) {
      deleteNotificationMutation.mutate({ id: notificationId, userId: user.id });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to the action URL if available
    if (notification.actionUrl) {
      setOpen(false);
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case NotificationEventType.WORKSPACE_CHAT_MESSAGE:
      case NotificationEventType.PROJECT_CHAT_MESSAGE:
        return <MessageSquare className="h-4 w-4" />;
      case NotificationEventType.WHITEBOARD_VERSION_CREATED:
        return <FileText className="h-4 w-4" />;
      case NotificationEventType.MODEL_ADDED:
      case NotificationEventType.MODEL_VERSION_NOTES_ADDED:
        return <Box className="h-4 w-4" />;
      case NotificationEventType.TASK_ASSIGNED:
        return <ClipboardList className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case NotificationEventType.WORKSPACE_CHAT_MESSAGE:
      case NotificationEventType.PROJECT_CHAT_MESSAGE:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case NotificationEventType.WHITEBOARD_VERSION_CREATED:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case NotificationEventType.MODEL_ADDED:
      case NotificationEventType.MODEL_VERSION_NOTES_ADDED:
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case NotificationEventType.TASK_ASSIGNED:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] p-0 bg-white border border-slate-200 shadow-lg rounded-lg" 
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
            <div className="border-b bg-background/95">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">Notifications</h2>
                  {unreadCount > 0 && (
                    <Badge variant="default" className="ml-1 text-xs px-1.5 py-0">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-6 text-xs px-2"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1 px-3 pb-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="h-6 text-xs px-2"
                >
                  All
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                  className="h-6 text-xs px-2"
                >
                  Unread
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'group flex items-start gap-2 p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                        !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/10'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                        getNotificationColor(notification.type)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-xs font-medium',
                              !notification.isRead && 'font-semibold'
                            )}>
                              {notification.title}
                            </p>
                            {notification.content && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.content}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-600 rounded-full mt-1" />
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          title="Delete notification"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
