import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@edunexa/ui';
import { SubjectGrid } from '@/components/marketing/subject-grid';

export const metadata: Metadata = { title: 'Subjects' };

export default function SubjectsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">Subjects</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The Class 10 subject list, organised straight from the published curriculum. Sign in as a
        student to open chapters and topics inside your dashboard.
      </p>
      <div className="mt-8">
        <SubjectGrid />
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button>
          <Link href="/app/subjects">Browse subjects (student)</Link>
        </Button>
        <Button variant="outline">
          <Link href="/curriculum">Explore the full curriculum</Link>
        </Button>
      </div>
    </div>
  );
}