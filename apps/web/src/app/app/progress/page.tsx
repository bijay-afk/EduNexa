import { Progress } from '@edunexa/ui';

export const metadata = { title: 'Progress' };

const topics = [
  { name: 'Quadratic Equations', pct: 90, score: 82 },
  { name: 'Linear Equations', pct: 100, score: 94 },
  { name: 'Triangles', pct: 45, score: 61 },
  { name: 'Probability', pct: 30, score: 52 },
];

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progress</h1>
      <div className="space-y-4">
        {topics.map((topic) => (
          <div key={topic.name} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{topic.name}</span>
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