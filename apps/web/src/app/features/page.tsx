import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Features' };

const features = [
  ['Structured notes', 'Topic-wise notes, formulas, worked examples, and common mistakes.'],
  ['Practice exercises', 'Questions with instant evaluation and explanations.'],
  ['Quizzes', 'Configurable by chapter/topic, difficulty, marks, and duration.'],
  ['Mock examinations', 'Timed, server-authoritative exams with question navigation.'],
  ['Progress tracking', 'Completion %, streaks, and weak/strong topic detection.'],
  ['Bookmarks', 'Save notes, formulas, examples, and questions for later.'],
  ['Study planner', 'Generate and edit a study schedule from exam date and hours.'],
  ['Search', 'Full-text search across subjects, chapters, topics, notes, and questions.'],
  ['Teacher question generation', 'Syllabus-grounded AI questions with source attribution, validation, and teacher approval.'],
  ['Question papers', 'Blueprint-based automatic paper generation and PDF export with answer keys.'],
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Features</h1>
      <dl className="mt-8 space-y-4">
        {features.map(([title, description]) => (
          <div key={title} className="rounded-lg border bg-card p-4 shadow-sm">
            <dt className="font-semibold">{title}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}