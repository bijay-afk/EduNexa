import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';

export const metadata = { title: 'Teacher Dashboard' };

const stats = [
  { label: 'My classes', value: '0' },
  { label: 'Students', value: '—' },
  { label: 'Question bank', value: '0' },
  { label: 'Papers exported', value: '0' },
];

export default function TeacherPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teacher workspace</h1>
        <p className="text-muted-foreground">
          Build questions, quizzes, and papers around the approved curriculum.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Classes</CardTitle>
            <CardDescription>No classes linked yet.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Badge variant="secondary">Assignments</Badge>
            <Badge variant="secondary">Quizzes</Badge>
            <Badge variant="secondary">Exams</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent question papers</CardTitle>
            <CardDescription>No question papers exported yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}