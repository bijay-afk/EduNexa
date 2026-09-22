import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@class10/ui';

export const metadata = { title: 'Question Bank' };

const banks = [
  { subject: 'Mathematics', items: [['Algebra · 25 MCQs', '12 Short', '8 Long'], ['Geometry · 20 MCQs', '14 Short']] },
  { subject: 'Science', items: [['Life Processes · 18 MCQs', '10 Short']] },
];

export default function QuestionBankPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">My question bank</h1>
      <p className="text-muted-foreground">
        Search, filter, tag, edit, and reuse questions in quizzes, papers, and assignments.
      </p>
      {banks.map((bank) => (
        <Card key={bank.subject}>
          <CardHeader>
            <CardTitle>{bank.subject}</CardTitle>
            <CardDescription>Owned question bank</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {bank.items.flat().map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}