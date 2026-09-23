'use client';

import { ArrowUpRight, BookOpen, Layers } from 'lucide-react';
import { Badge, Card, Skeleton } from '@edunexa/ui';
import { useSubjects } from '@/lib/queries';

const demoSubjects = [
  { name: 'Mathematics', chapters: 14 },
  { name: 'Science', chapters: 12 },
  { name: 'English', chapters: 10 },
  { name: 'Social Studies', chapters: 11 },
];

/** Editorial grid of Grade-10 subjects, live from the curriculum API with a demo fallback. */
export function SubjectGrid() {
  const { data, isLoading, isError } = useSubjects();
  const live = data?.items ?? [];
  const showingDemo = isError;

  const cards = showingDemo
    ? demoSubjects.map((s) => ({ name: s.name, chapters: s.chapters }))
    : live.map((s) => ({ name: s.name, chapters: s._count?.chapters ?? 0 }));

  return (
    <div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((subject, i) => (
            <Card
              key={subject.name}
              className="group relative overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex h-full flex-col justify-between gap-8 p-6">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-secondary p-2.5" aria-hidden>
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowUpRight
                    className="h-5 w-5 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="font-display text-4xl font-semibold text-muted-foreground/40">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-3 text-xl font-medium">{subject.name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" aria-hidden />
                    {subject.chapters} chapters
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showingDemo ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">Sample</Badge> Showing sample subjects — start the API to see the
          live curriculum.
        </p>
      ) : null}
    </div>
  );
}