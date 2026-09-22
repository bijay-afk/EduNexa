import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@class10/ui';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account & preferences</CardTitle>
          <CardDescription>Language, notifications, and account actions</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Language switching and notification preferences land with the engagement phase.
        </CardContent>
      </Card>
    </div>
  );
}