'use client';

import Link from 'next/link';
import { use } from 'react';
import { Card, CardContent, Skeleton } from '@class10/ui';
import { useChapter } from '@/lib/queries';

export default function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useChapter(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/app/subjects" className="hover:underline">
            Subjects
          </Link>
        </p>
        <p className="text-sm text-destructive">Could not load this chapter: {error?.message ?? 'not found'}</p>
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
          / {data.subject.name}
        </p>
        <h1 className="text-2xl font-bold">{data.name}</h1>
      </div>
      <div className="grid gap-4">
        {data.topics.map((topic) => (
          <Link key={topic.id} href={`/app/topics/${topic.id}`}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="py-4">
                <p className="font-medium">{topic.name}</p>
                {topic.summary ? (
                  <p className="mt-1 text-sm text-muted-foreground">{topic.summary}</p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}