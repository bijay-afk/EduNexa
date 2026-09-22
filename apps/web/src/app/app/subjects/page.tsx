'use client';

import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle, Skeleton } from '@class10/ui';
import { useSubjects } from '@/lib/queries';

export default function SubjectsPage() {
  const { data, isLoading, isError, error } = useSubjects();
  const subjects = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <p className="text-sm text-destructive">Could not load subjects: {error.message}</p>
        <p className="text-sm text-muted-foreground">
          Start the API (<code>npm run dev:api</code>) and seed the database to see live data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subjects</h1>
      {subjects.length === 0 ? (
        <p className="text-muted-foreground">
          No subjects published yet — run <code>npm run db:seed</code> against the API.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((subject) => (
            <Link key={subject.id} href={`/app/subjects/${subject.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{subject.name}</CardTitle>
                  <CardDescription>
                    {subject._count?.chapters ?? 0} chapters · tap to open
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}