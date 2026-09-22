import { SettingsView } from '@/components/student/settings-view';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsView />
    </div>
  );
}