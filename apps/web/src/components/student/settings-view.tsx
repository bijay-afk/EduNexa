'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';
import { clearSession } from '@/lib/api';

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ title, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsView() {
  const router = useRouter();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [quizReminders, setQuizReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  function onSignOut() {
    clearSession();
    router.push('/login');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications & preferences</CardTitle>
          <CardDescription>These preferences are saved in your browser for now.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleRow
            title="Email notifications"
            description="Get exam results and new content by email."
            checked={emailNotifs}
            onChange={setEmailNotifs}
          />
          <ToggleRow
            title="Quiz reminders"
            description="Remind me when a weekly practice quiz opens."
            checked={quizReminders}
            onChange={setQuizReminders}
          />
          <ToggleRow
            title="Weekly progress report"
            description="A summary of my progress every Sunday."
            checked={weeklyReport}
            onChange={setWeeklyReport}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Server-persisted preferences and account settings land with the users and engagement APIs.
      </p>
    </div>
  );
}