import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@class10/ui';

export const metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sita Sharma</CardTitle>
          <CardDescription>student@example.com · Student</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Joined 2026 · streak 12 days · 72% overall progress. Profile editing connects to the users
          API in a later phase.
        </CardContent>
      </Card>
    </div>
  );
}