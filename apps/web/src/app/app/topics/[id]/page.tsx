'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, Bookmark, Check, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@edunexa/ui';
import { ContentBlocks } from '@/components/content/content-blocks';
import { useTopic, useTopicContent } from '@/lib/queries';
import type { ContentBlock } from '@/lib/api';

export default function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const topic = useTopic(id);
  const content = useTopicContent(id);

  if (topic.isLoading || content.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (topic.isError || !topic.data) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/app/subjects" className="hover:underline">
            Subjects
          </Link>
        </p>
        <p className="text-sm text-destructive">Could not load this topic: {topic.error?.message ?? 'not found'}</p>
      </div>
    );
  }

  // Each published content row contributes a heading followed by its structured blocks.
  const contentBlocks: ContentBlock[] = (content.data ?? []).flatMap((row) => [
    { type: 'heading', text: row.title },
    ...row.blocks,
  ]);

  return (
    <div className="space-y-10">
      <div className="max-w-3xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          <Link href="/app/subjects" className="text-primary hover:underline">
            {topic.data.chapter.subject.name}
          </Link>{' '}
          /{' '}
          <Link href={`/app/chapters/${topic.data.chapter.id}`} className="text-primary hover:underline">
            {topic.data.chapter.name}
          </Link>
        </p>
        <h1 className="text-4xl md:text-5xl">{topic.data.name}</h1>
        {topic.data.summary ? (
          <p className="text-lg leading-relaxed text-muted-foreground">{topic.data.summary}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button className="gap-2">
          <Check className="h-4 w-4" aria-hidden />
          Mark complete
        </Button>
        <Button variant="outline" className="gap-2">
          <Bookmark className="h-4 w-4" aria-hidden />
          Bookmark
        </Button>
        <Button variant="ghost" className="gap-2">
          <Link href="/app/quiz">
            <Sparkles className="h-4 w-4" aria-hidden />
            Practice quiz
          </Link>
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="px-8 py-10 md:px-12">
          {content.isError ? (
            <p className="text-sm text-destructive">
              Could not load content: {content.error?.message}
            </p>
          ) : contentBlocks.length === 0 ? (
            <p className="text-muted-foreground">No published content for this topic yet.</p>
          ) : (
            <div className="mx-auto max-w-2xl [&_h2]:mt-10 [&_h2:first-child]:mt-0 [&_p]:leading-8">
              <ContentBlocks blocks={contentBlocks} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between border-t pt-6">
        <Button variant="link" className="gap-2 px-0">
          <Link href={`/app/chapters/${topic.data.chapter.id}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to {topic.data.chapter.name}
          </Link>
        </Button>
      </div>
    </div>
  );
}