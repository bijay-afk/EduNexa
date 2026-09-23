'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowRight, CircleDot } from 'lucide-react';
import { Skeleton } from '@edunexa/ui';
import { useChapter } from '@/lib/queries';

export default function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, error } = useChapter(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
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
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          <Link href="/app/subjects" className="text-primary hover:underline">
            Subjects
          </Link>{' '}
          /{' '}
          <Link href={`/app/subjects/${data.subject.id}`} className="text-primary hover:underline">
            {data.subject.name}
          </Link>
        </p>
        <h1 className="text-5xl md:text-6xl">{data.name}</h1>
        <p className="text-lg text-muted-foreground">
          {data.topics.length} {data.topics.length === 1 ? 'topic' : 'topics'} · study them in order,
          or jump straight to the one you need.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {data.topics.map((topic, i) => (
          <Link
            key={topic.id}
            href={`/app/topics/${topic.id}`}
            className="group rounded-xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-display text-3xl font-semibold text-muted-foreground/50">
                {String(i + 1).padStart(2, '0')}
              </span>
              <ArrowRight
                className="h-5 w-5 text-primary transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </div>
            <h2 className="mt-4 flex items-start gap-2 text-lg font-medium group-hover:text-primary md:text-xl">
              <CircleDot className="mt-1.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              {topic.name}
            </h2>
            {topic.summary ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{topic.summary}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}