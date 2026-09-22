'use client';

import Link from 'next/link';
import { use } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@class10/ui';
import { ContentBlocks } from '@/components/content/content-blocks';
import { useTopic, useTopicContent } from '@/lib/queries';
import type { ContentBlock } from '@/lib/api';

export default function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const topic = useTopic(id);
  const content = useTopicContent(id);

  if (topic.isLoading || content.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/app/subjects" className="hover:underline">
            {topic.data.chapter.subject.name}
          </Link>{' '}
          /{' '}
          <Link href={`/app/chapters/${topic.data.chapter.id}`} className="hover:underline">
            {topic.data.chapter.name}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">{topic.data.name}</h1>
        {topic.data.summary ? <p className="mt-1 text-muted-foreground">{topic.data.summary}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          {content.isError ? (
            <p className="text-sm text-destructive">
              Could not load content: {content.error?.message}
            </p>
          ) : contentBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published content for this topic yet.</p>
          ) : (
            <ContentBlocks blocks={contentBlocks} />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button>Mark complete</Button>
        <Button variant="outline">Bookmark</Button>
        <Button variant="ghost">
          <Link href="/app/quiz">Practice quiz</Link>
        </Button>
      </div>
    </div>
  );
}