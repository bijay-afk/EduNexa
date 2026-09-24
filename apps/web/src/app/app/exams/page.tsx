import { CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@edunexa/ui';

export const metadata = { title: 'Mock Exams' };

export default function ExamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mock examinations</h1>
        <p className="text-muted-foreground">
          Exams run on a server-authoritative timer with question navigation and auto-submit.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-1 py-12 text-center text-sm text-muted-foreground">
          <CalendarClock className="mb-1 h-6 w-6" aria-hidden />
          <p className="font-medium text-foreground">No mock exams scheduled yet</p>
          <p>Scheduled exams will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}