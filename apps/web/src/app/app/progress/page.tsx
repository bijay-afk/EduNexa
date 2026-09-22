import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@edunexa/ui';

export const metadata = { title: 'Progress' };

const topics = [
  { name: 'Quadratic Equations', pct: 90, score: 82, weak: false },
  { name: 'Linear Equations', pct: 100, score: 94, weak: false },
  { name: 'Triangles', pct: 45, score: 61, weak: true },
  { name: 'Probability', pct: 30, score: 52, weak: true },
];

export default function ProgressPage() {
  const overall = Math.round(topics.reduce((sum, t) => sum + t.pct, 0) / topics.length);

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
          <p className="mt-2 text-sm text-muted-foreground">{overall}% complete · demo analytics</p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {topics.map((topic) => (
          <div key={topic.name} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium">
                {topic.name}
                {topic.weak ? <Badge variant="secondary">weak spot</Badge> : null}
              </span>
              <span className="text-sm text-muted-foreground">avg score {topic.score}%</span>
            </div>
            <Progress value={topic.pct} aria-label={`${topic.name} ${topic.pct} percent complete`} />
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Weak topics (score below 60%) appear in the planner for recommended practice.
      </p>
    </div>
  );
}