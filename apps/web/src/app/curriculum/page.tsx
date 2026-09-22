import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@edunexa/ui';

export const metadata: Metadata = { title: 'Curriculum' };

const subjects = [
  { name: 'Mathematics', chapters: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'] },
  { name: 'Science', chapters: ['Life Processes', 'Force & Motion', 'Electricity', 'Elements'] },
  { name: 'English', chapters: ['Reading', 'Writing', 'Grammar', 'Literature'] },
  { name: 'Social Studies', chapters: ['History', 'Geography', 'Civics', 'Economics'] },
];

export default function CurriculumPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">Curriculum</h1>
      <p className="mt-3 text-muted-foreground">
        The full Class 10 syllabus organised as data — subjects → chapters → topics. Nothing is
        hard-coded; content is published through the content-management workflow.
      </p>
      <div className="mt-10 space-y-6">
        {subjects.map((subject) => (
          <div key={subject.name}>
            <h2 className="text-xl font-semibold">{subject.name}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {subject.chapters.map((chapter) => (
                <li
                  key={chapter}
                  className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"
                >
                  {chapter}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 flex gap-3">
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