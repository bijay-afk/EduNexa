import { NotificationsView } from '@/components/student/notifications-view';

export const metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <NotificationsView />
    </div>
  );
}