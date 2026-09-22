'use client';

import { BookOpen, Layers } from 'lucide-react';
import { Badge, Card, CardContent, Skeleton } from '@edunexa/ui';
import { useSubjects } from '@/lib/queries';

const demoSubjects = [
  { name: 'Mathematics', chapters: 14 },
  { name: 'Science', chapters: 12 },
  { name: 'English', chapters: 10 },
  { name: 'Social Studies', chapters: 11 },
];

/** Grid of Grade-10 subjects, live from the curriculum API with a demo fallback. */
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
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((subject) => (
            <Card key={subject.name} className="transition-colors hover:border-primary">
              <CardContent className="flex items-start gap-3 py-4">
                <div className="rounded-md bg-secondary p-2" aria-hidden>
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{subject.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" aria-hidden />
                    {subject.chapters} chapters
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {showingDemo ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">Sample</Badge> Showing sample subjects — start the API to see the
          live curriculum.
        </p>
      ) : null}
    </div>
  );
}