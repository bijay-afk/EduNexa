import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';

export const metadata = { title: 'Teacher Dashboard' };

const stats = [
  { label: 'My classes', value: '2' },
  { label: 'Students', value: '86' },
  { label: 'Question bank', value: '142' },
  { label: 'Papers exported', value: '9' },
];

export default function TeacherPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
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
            <CardTitle>Class 10-A</CardTitle>
            <CardDescription>Average score 72% · strong: Algebra · weak: Geometry</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">Assignments</Badge>
            <Badge variant="secondary">Quizzes</Badge>
            <Badge variant="secondary">Exams</Badge>
            <Badge variant="secondary">Performance</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent question papers</CardTitle>
            <CardDescription>Mathematics mid-term (40 marks) · Science unit test (25 marks)</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}