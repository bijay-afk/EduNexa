import Link from 'next/link';
import { Badge } from '@edunexa/ui';
import { notices } from '@/lib/notices';

const tagTone: Record<string, 'default' | 'secondary' | 'outline'> = {
  Exam: 'default',
  Results: 'default',
  Content: 'secondary',
  Schedule: 'secondary',
  General: 'outline',
};

export function NoticeBoard({ limit }: { limit?: number }) {
  const items = limit ? notices.slice(0, limit) : notices;

  if (items.length === 0) {
    return (
      <p className="rounded-lg border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        No notices published yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((notice) => (
        <article key={notice.id} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={tagTone[notice.tag]}>{notice.tag}</Badge>
            <time className="text-xs text-muted-foreground">{notice.date}</time>
          </div>
          <h3 className="mt-2 font-semibold">{notice.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{notice.body}</p>
        </article>
      ))}
      {limit && notices.length > limit ? (
        <Link href="/notices" className="inline-block text-sm text-primary underline-offset-4 hover:underline">
          View all notices →
        </Link>
      ) : null}
    </div>
  );
}