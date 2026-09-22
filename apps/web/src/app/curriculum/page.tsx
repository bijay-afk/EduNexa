import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@edunexa/ui';
import { CurriculumExplorer } from '@/components/marketing/curriculum-explorer';

export const metadata: Metadata = { title: 'Curriculum' };

export default function CurriculumPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">Curriculum</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The full Class 10 syllabus organised as data — subjects → chapters → topics. Nothing is
        hard-coded; content is published through the content-management workflow.
      </p>
      <div className="mt-8">
        <CurriculumExplorer />
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Button>
          <Link href="/app/subjects">Open student subjects</Link>
        </Button>
        <Button variant="outline">
          <Link href="/teacher">Teacher curriculum browser</Link>
        </Button>
      </div>
    </div>
  );
}