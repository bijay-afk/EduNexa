'use client';

import { ArrowUpRight, BookOpen, Layers } from 'lucide-react';
import { Card, Skeleton } from '@edunexa/ui';
import { useSubjects } from '@/lib/queries';

/** Editorial grid of Grade-10 subjects, live from the curriculum API. */
export function SubjectGrid() {
  const { data, isLoading } = useSubjects();
  const live = data?.items ?? [];

  return (
    <div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : live.length === 0 ? (
        <p className="rounded-lg border border-border/60 bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          No subjects published yet. The Class 10 curriculum will appear here.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {live.map((subject, i) => (
            <Card
              key={subject.id}
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
                    {subject._count?.chapters ?? 0} chapters
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}