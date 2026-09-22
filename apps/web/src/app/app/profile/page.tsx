'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';
import { clearSession, getSession } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const session = getSession();
  const user = session?.user;

  if (!user) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>{user.fullName ?? 'Student'}</CardTitle>
          <CardDescription>
            {user.email} · {user.role[0] + user.role.slice(1).toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Profile editing connects to the users API in a later phase.
        </CardContent>
      </Card>
      <Button
        variant="outline"
        onClick={() => {
          clearSession();
          router.push('/login');
        }}
      >
        Sign out
      </Button>
    </div>
  );
}