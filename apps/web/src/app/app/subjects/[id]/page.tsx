'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { Skeleton } from '@edunexa/ui';
import { useSubject } from '@/lib/queries';

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useSubject(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl capitalize">{id}</h1>
        <p className="text-sm text-destructive">Could not load this subject: {error?.message ?? 'not found'}</p>
        <Link href="/app/subjects" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          <Link href="/app/subjects" className="text-primary hover:underline">
            Subjects
          </Link>{' '}
          / {data.grade.name}
        </p>
        <h1 className="text-5xl md:text-6xl">{data.name}</h1>
        <p className="text-lg text-muted-foreground">
          {data.chapters.length} {data.chapters.length === 1 ? 'chapter' : 'chapters'} · organised
          topic by topic. Select a chapter to begin.
        </p>
      </div>

      <div className="divide-y divide-border border-y">
        {data.chapters.map((chapter, i) => (
          <Link
            key={chapter.id}
            href={`/app/chapters/${chapter.id}`}
            className="group flex items-center gap-6 py-6 transition-colors hover:bg-muted/40 md:gap-10"
          >
            <span className="hidden font-display text-4xl font-semibold text-muted-foreground/50 sm:block">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-medium group-hover:text-primary md:text-2xl">
                {chapter.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                {chapter._count?.topics ?? 0}{' '}
                {(chapter._count?.topics ?? 0) === 1 ? 'topic' : 'topics'}
              </p>
            </div>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  );
}