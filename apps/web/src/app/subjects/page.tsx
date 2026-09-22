import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@edunexa/ui';

export const metadata: Metadata = { title: 'Subjects' };

const subjects = ['Mathematics', 'Science', 'English', 'Social Studies'];

export default function SubjectsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">Subjects</h1>
      <p className="mt-3 text-muted-foreground">
        Subject list for Class 10. Sign in as a student to open chapters and topics.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {subjects.map((subject) => (
          <Link
            key={subject}
            href="/app/subjects"
            className="rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary"
          >
            <h2 className="text-lg font-semibold">{subject}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Chapters · Topics · Practice</p>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <Button>
          <Link href="/app/subjects">Browse subjects (student)</Link>
        </Button>
      </div>
    </div>
  );
}