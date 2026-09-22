import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">About the platform</h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
        <p>
          EduNexa organises the complete approved grade-10 curriculum into a
          structured digital learning environment. Students browse subjects, chapters, and topics;
          study notes and examples; practise with exercises and quizzes; and take full mock exams
          with progress tracking and weak-topic detection.
        </p>
        <p>
          Teachers have a dedicated portal: curriculum browser, question bank, AI question generation
          that is strictly grounded in approved content, question-paper builder, and student
          performance analytics.
        </p>
        <p>
          The platform treats curriculum and approved educational content as its foundation, students
          and teachers as the primary users, and AI as an assisting technology operating within strict
          content boundaries.
        </p>
      </div>
    </div>
  );
}