import { QuestionBankView } from '@/components/teacher/question-bank-view';

export const metadata = { title: 'Question Bank' };

export default function QuestionBankPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My question bank</h1>
        <p className="text-muted-foreground">
          Search, filter, tag, edit, and reuse questions in quizzes, papers, and assignments.
        </p>
      </div>
      <QuestionBankView />
    </div>
  );
}