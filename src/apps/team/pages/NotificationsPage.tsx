/**
 * NotificationsPage Component
 * Displays all notifications for the user across all workspaces
 */

import { useEffect, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please sign in to view notifications</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className="h-7 text-xs"
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('unread')}
                className="h-7 text-xs"
              >
                Unread
              </Button>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'group flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer',
                  !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/10'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Icon */}
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  getNotificationColor(notification.type)
                )}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium',
                        !notification.isRead && 'font-semibold'
                      )}>
                        {notification.title}
                      </p>
                      {notification.content && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
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
                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
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
  );
}
