'use client';

import Link from 'next/link';
import { use } from 'react';
import { Card, CardContent, Skeleton } from '@class10/ui';
import { useSubject } from '@/lib/queries';

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSubject(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold capitalize">{id}</h1>
        <p className="text-sm text-destructive">Could not load this subject: {error?.message ?? 'not found'}</p>
        <Link href="/app/subjects" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/app/subjects" className="hover:underline">
            Subjects
          </Link>{' '}
          / {data.grade.name}
        </p>
        <h1 className="text-2xl font-bold">{data.name}</h1>
      </div>
      <div className="grid gap-4">
        {data.chapters.map((chapter) => (
          <Link key={chapter.id} href={`/app/chapters/${chapter.id}`}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center justify-between py-4">
                <span className="font-medium">{chapter.name}</span>
                <span className="text-sm text-muted-foreground">
                  {chapter._count?.topics ?? 0} topics
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}