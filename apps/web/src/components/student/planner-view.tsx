'use client';

import { useState } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@edunexa/ui';
import { useSubjects } from '@/lib/queries';

interface PlanDay {
  label: string;
  date: string;
  tasks: string[];
}

export function PlannerView() {
  const { data } = useSubjects();
  const subjects = data?.items ?? [];
  const [examDate, setExamDate] = useState('');
  const [hours, setHours] = useState('2');
  const [plan, setPlan] = useState<PlanDay[] | null>(null);

  function generate() {
    if (!examDate) return;
    const target = new Date(`${examDate}T23:59:59`);
    const today = new Date();
    const days =
      Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const safeDays = Math.max(1, Math.min(days, 14));

    const pool = subjects.length
      ? subjects.map((s) => `${s.name} — revise all ${s._count?.chapters ?? 0} chapters`)
      : ['Flexible revision block'];

    const perDay = Math.max(1, Math.round((Number(hours) || 1) / 1));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    const generated: PlanDay[] = [];
    for (let i = 0; i < safeDays; i++) {
      const label = `${safeDays - i} day${safeDays - i === 1 ? '' : 's'} to go`;
      const start = i * perDay;
      const tasks = shuffled.slice(start, start + perDay);
      if (i === safeDays - 1) {
        tasks.push('Practice with a full-length mock paper');
      }
      generated.push({
        label,
        date: formatDate(addDays(today, i)),
        tasks: tasks.length ? tasks : ['Flexible revision block'],
      });
    }
    setPlan(generated);
  }

  function addDays(base: Date, n: number) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  }

  function formatDate(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate a study plan</CardTitle>
          <CardDescription>From your exam date and daily study hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="planner-exam-date">
                Exam date
              </label>
              <Input
                id="planner-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="planner-hours">
                Hours per day
              </label>
              <Input
                id="planner-hours"
                type="number"
                min={1}
                max={8}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-4" onClick={generate} disabled={!examDate}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Generate plan
          </Button>
        </CardContent>
      </Card>

      {plan ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.map((day) => (
            <Card key={`${day.date}-${day.label}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{day.label}</CardTitle>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {day.date}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {day.tasks.map((task) => (
                    <li key={task}>• {task}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Study blocks are built from the published Class 10 curriculum. A synced, editable plan
        arrives with the engagement API phase.
      </p>
    </div>
  );
}