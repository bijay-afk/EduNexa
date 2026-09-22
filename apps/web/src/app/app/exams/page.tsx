import { Badge, Card, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';

export const metadata = { title: 'Mock Exams' };

const exams = [
  { title: 'Mathematics — Full mock', detail: '75 marks · 3 hours · negative marking', status: 'Available' },
  { title: 'Science — Term papers', detail: '50 marks · 2 hours', status: 'Available' },
  { title: 'English — Sample paper', detail: '40 marks · 1.5 hours', status: 'Upcoming' },
];

export default function ExamsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mock examinations</h1>
      <p className="text-muted-foreground">
        Exams run on a server-authoritative timer with question navigation and auto-submit.
      </p>
      <div className="grid gap-4">
        {exams.map((exam) => (
          <Card key={exam.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{exam.title}</CardTitle>
                  <CardDescription>{exam.detail}</CardDescription>
                </div>
                <Badge>{exam.status}</Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}