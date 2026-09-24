'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@edunexa/ui';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  read: boolean;
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unread = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {unread > 0 ? (
          <Badge>
            <Bell className="mr-1 h-3 w-3" aria-hidden />
            {unread} unread
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">You’re all caught up.</span>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4" aria-hidden />
            Mark all read
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={notifications.length === 0}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Clear all
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Bell className="h-6 w-6" aria-hidden />
            <p>No notifications. New quiz reminders and content updates will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {notifications.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <button type="button" className="min-w-0 text-left" onClick={() => markRead(n.id)}>
                  <p className={n.read ? 'font-normal text-muted-foreground' : 'font-medium'}>
                    {n.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{n.type}</p>
                </button>
                {!n.read ? <Badge>New</Badge> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}