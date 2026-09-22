import { Badge, Card, CardContent } from '@class10/ui';

export const metadata = { title: 'Notifications' };

const notifications = [
  { type: 'Quiz reminder', title: 'Algebra quiz opens today', read: false },
  { type: 'New content', title: 'Science — Carbon compounds notes published', read: false },
  { type: 'Study reminder', title: 'You have a 2-hour block scheduled for Mathematics', read: true },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.title}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.type}</p>
              </div>
              {!n.read && <Badge>New</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}