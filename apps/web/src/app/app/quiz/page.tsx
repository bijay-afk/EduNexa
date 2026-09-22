import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';

export const metadata = { title: 'Quiz' };

const quizzes = [
  { title: 'Algebra — Linear Equations', type: 'MCQ · 10 questions', due: 'Today' },
  { title: 'Quadratic Equations', type: 'MCQ · 8 questions', due: 'Friday' },
  { title: 'Geometry — Triangles', type: 'Short answer · 6 questions', due: 'Next week' },
];

export default function QuizPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quizzes</h1>
      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <Card key={quiz.title}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{quiz.title}</CardTitle>
                  <CardDescription>{quiz.type}</CardDescription>
                </div>
                <Badge variant="secondary">{quiz.due}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Phase 4/6 — quiz attempts, timers, and results hook up to the assessment API here.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}