'use client';

import { useState } from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import { Badge, Skeleton } from '@edunexa/ui';
import { useSubject, useSubjects } from '@/lib/queries';

const demoChapters: Record<string, string[]> = {
  Mathematics: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'],
  Science: ['Life Processes', 'Force & Motion', 'Electricity', 'Elements'],
  English: ['Reading', 'Writing', 'Grammar', 'Literature'],
  'Social Studies': ['History', 'Geography', 'Civics', 'Economics'],
};

function SubjectChapters({ subjectId, name }: { subjectId: string; name: string }) {
  const { data, isLoading, isError } = useSubject(subjectId, { enabled: !!subjectId });

  if (isLoading) {
    return (
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {demoChapters[name]?.map((chapter, i) => (
          <li
            key={chapter}
            className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground"
          >
            <span className="font-display text-lg font-semibold text-muted-foreground/40">
              {String(i + 1).padStart(2, '0')}
            </span>
            {chapter}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {data.chapters.map((chapter, i) => (
        <li
          key={chapter.id}
          className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground"
        >
          <span className="font-display text-lg font-semibold text-muted-foreground/40">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1 truncate">{chapter.name}</span>
          <span className="shrink-0 text-xs">{chapter._count?.topics ?? 0} topics</span>
        </li>
      ))}
    </ul>
  );
}

/** Editorial, expandable subject → chapters view of the Grade-10 curriculum. */
export function CurriculumExplorer() {
  const { data, isLoading, isError } = useSubjects();
  const [openId, setOpenId] = useState<string | null>(null);

  const showingDemo = isError;
  const list = showingDemo
    ? Object.keys(demoChapters).map((name) => ({ key: name, name }))
    : (data?.items ?? []).map((s) => ({ key: s.id, name: s.name }));

  return (
    <div className="space-y-3">
      {isLoading ? (
        [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)
      ) : (
        list.map((subject, i) => {
          const open = openId === subject.key;
          return (
            <div key={subject.key}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : subject.key)}
                className="flex w-full items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4 text-left shadow-sm transition-colors hover:border-primary/50"
                aria-expanded={open}
              >
                <span className="font-display text-2xl font-semibold text-muted-foreground/40">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 font-medium">{subject.name}</span>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
                  aria-hidden
                />
              </button>
              {open ? (
                <div className="px-1 pt-1">
                  <SubjectChapters subjectId={subject.key} name={subject.name} />
                </div>
              ) : null}
            </div>
          );
        })
      )}
      {showingDemo ? (
        <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <Badge variant="secondary">Sample</Badge> Demo structure shown — start the API for the full
          published curriculum.
        </p>
      ) : null}
      <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <Layers className="h-3.5 w-3.5" aria-hidden />
        Tap a subject to expand its chapters and topics.
      </p>
    </div>
  );
}