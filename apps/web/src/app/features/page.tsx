import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';

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
    <div className="mx-auto max-w-4xl px-4 py-20">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">EduNexa</p>
        <h1 className="text-5xl md:text-6xl">Features</h1>
        <p className="text-lg text-muted-foreground">
          Everything in one classroom — built around the approved Class 10 curriculum.
        </p>
      </div>

      <dl className="mt-14 border-t border-border">
        {features.map(([title, description], i) => (
          <div
            key={title}
            className="group flex items-start gap-8 border-b border-border py-7 transition-colors hover:bg-muted/40"
          >
            <span className="font-display text-3xl font-semibold text-muted-foreground/40">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex min-w-0 flex-1 gap-6">
              <dt className="w-56 shrink-0 pt-1 text-xl font-medium md:text-2xl">{title}</dt>
              <dd className="pt-1.5 text-muted-foreground md:text-lg">{description}</dd>
            </div>
            <ArrowUpRight
              className="mt-2 h-5 w-5 shrink-0 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          </div>
        ))}
      </dl>
    </div>
  );
}