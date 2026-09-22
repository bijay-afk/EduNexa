import { Card, CardDescription, CardHeader, CardTitle } from '@class10/ui';

export const metadata = { title: 'Study Planner' };

const plan = [
  { day: 'Day 1', task: 'Mathematics — Algebra' },
  { day: 'Day 2', task: 'Science — Physics' },
  { day: 'Day 3', task: 'Mathematics — Geometry' },
  { day: 'Day 4', task: 'Mock exam + review weak topics' },
];

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Study planner</h1>
      <p className="text-muted-foreground">
        Generated from your exam date and study hours. You can edit it manually at any time.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {plan.map((day) => (
          <Card key={day.day}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{day.day}</CardTitle>
              <CardDescription className="text-base font-medium text-foreground">{day.task}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generate a new plan</CardTitle>
          <CardDescription>Exam date · available hours · priorities (Phase 7)</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}