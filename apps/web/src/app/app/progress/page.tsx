import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@edunexa/ui';

export const metadata = { title: 'Progress' };

export default function ProgressPage() {
  const overall = 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-muted-foreground">
          Completion and average scores per topic over your study history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall completion</CardTitle>
          <CardDescription>Across published topics</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={overall} aria-label={`${overall} percent complete`} />
          <p className="mt-2 text-sm text-muted-foreground">No progress recorded yet.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-center gap-1 py-12 text-center text-sm text-muted-foreground">
          <BarChart3 className="mb-1 h-6 w-6" aria-hidden />
          <p className="font-medium text-foreground">No topics studied yet</p>
          <p>Completion and scores per topic will appear here as you study.</p>
        </CardContent>
      </Card>
    </div>
  );
}