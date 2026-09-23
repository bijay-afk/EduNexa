'use client';

import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Card, CardContent, Skeleton } from '@edunexa/ui';
import { useSubjects } from '@/lib/queries';

export default function SubjectsPage() {
  const { data, isLoading, isError, error } = useSubjects();
  const subjects = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl">Subjects</h1>
        <p className="text-sm text-destructive">Could not load subjects: {error.message}</p>
        <p className="text-muted-foreground">
          Start the API (<code>npm run dev:api</code>) and seed the database to see live data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Class 10 · Curriculum
        </p>
        <h1 className="text-5xl md:text-6xl">Subjects</h1>
        <p className="text-lg text-muted-foreground">
          Seven subjects, mapped chapter by chapter from the published syllabus. Open a subject to
          step through its chapters and topics.
        </p>
      </div>

      {subjects.length === 0 ? (
        <p className="text-muted-foreground">
          No subjects published yet — run <code>npm run db:seed</code> against the API.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {subjects.map((subject, i) => (
            <Link key={subject.id} href={`/app/subjects/${subject.id}`} className="group">
              <Card className="relative h-full overflow-hidden border-border/60 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
                <CardContent className="flex flex-col justify-between gap-10 p-8">
                  <div className="flex items-start justify-between">
                    <span className="font-display text-5xl font-semibold text-muted-foreground/50">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <ArrowUpRight
                      className="h-6 w-6 text-primary transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                      aria-hidden
                    />
                  </div>
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                      <span className="text-xs font-medium uppercase tracking-widest text-primary">
                        {subject._count?.chapters ?? 0}{' '}
                        {(subject._count?.chapters ?? 0) === 1 ? 'chapter' : 'chapters'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-medium md:text-3xl">{subject.name}</h2>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}