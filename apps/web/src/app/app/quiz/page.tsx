import { QuizCenter } from '@/components/student/quiz-center';

export const metadata = { title: 'Quiz' };

export default function QuizPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quizzes</h1>
        <p className="text-muted-foreground">
          Practice quizzes with instant feedback. Start a sample quiz below.
        </p>
      </div>
      <QuizCenter />
    </div>
  );
}