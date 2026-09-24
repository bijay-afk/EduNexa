'use client';

import { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@edunexa/ui';

interface Bookmark {
  id: string;
  type: 'Formula' | 'Note' | 'Question';
  title: string;
  ref: string;
}

const filters = ['All', 'Formula', 'Note', 'Question'] as const;

export function BookmarksView() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');

  const visible = filter === 'All' ? bookmarks : bookmarks.filter((b) => b.type === filter);

  function remove(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                filter === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {bookmarks.length} saved{filter !== 'All' ? ` · ${visible.length} ${filter.toLowerCase()}` : ''}
        </p>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Bookmark className="h-6 w-6" aria-hidden />
            <p>Nothing here yet. Save a note, formula, or question and it will appear in this list.</p>
            {bookmarks.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setFilter('All')}>
                Show all bookmarks
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((bookmark) => (
            <Card key={bookmark.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{bookmark.title}</p>
                  <p className="text-sm text-muted-foreground">{bookmark.ref}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{bookmark.type}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${bookmark.title}`}
                    onClick={() => remove(bookmark.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}