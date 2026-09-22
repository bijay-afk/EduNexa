'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, Card, CardContent, Input } from '@edunexa/ui';

interface DemoQuestion {
  id: string;
  subject: string;
  chapter: string;
  type: 'MCQ' | 'Short answer' | 'Long answer';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  text: string;
}

const questions: DemoQuestion[] = [
  { id: 'q-1', subject: 'Mathematics', chapter: 'Algebra', type: 'MCQ', difficulty: 'Easy', text: 'Factorise x² − 9' },
  { id: 'q-2', subject: 'Mathematics', chapter: 'Quadratic Equations', type: 'Short answer', difficulty: 'Medium', text: 'Find the roots of x² − 5x + 6 = 0' },
  { id: 'q-3', subject: 'Mathematics', chapter: 'Triangles', type: 'Long answer', difficulty: 'Medium', text: 'Prove angle sum of a triangle is 180°' },
  { id: 'q-4', subject: 'Mathematics', chapter: 'Probability', type: 'MCQ', difficulty: 'Hard', text: 'Probability of drawing two aces without replacement' },
  { id: 'q-5', subject: 'Science', chapter: 'Life Processes', type: 'MCQ', difficulty: 'Easy', text: 'Site of gaseous exchange in humans' },
  { id: 'q-6', subject: 'Science', chapter: 'Electricity', type: 'Short answer', difficulty: 'Medium', text: 'State Ohm’s law and its formula' },
  { id: 'q-7', subject: 'Science', chapter: 'Carbon Compounds', type: 'Long answer', difficulty: 'Hard', text: 'Distinguish saturated and unsaturated hydrocarbons' },
  { id: 'q-8', subject: 'English', chapter: 'Grammar', type: 'MCQ', difficulty: 'Easy', text: 'Choose the correct passive voice form' },
];

const typeFilters = ['All', 'MCQ', 'Short answer', 'Long answer'] as const;

export function QuestionBankView() {
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<(typeof typeFilters)[number]>('All');

  const query = term.trim().toLowerCase();
  const visible = questions.filter((q) => {
    const matchesTerm =
      !query ||
      [q.text, q.subject, q.chapter, q.type, q.difficulty].some((field) =>
        field.toLowerCase().includes(query),
      );
    const matchesType = filter === 'All' || q.type === filter;
    return matchesTerm && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            placeholder="Search questions, subjects, chapters…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                filter === t
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {visible.length} of {questions.length} questions shown
      </p>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No questions match “{term}”. Try a different search term or filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((question) => (
            <Card key={question.id}>
              <CardContent className="py-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{question.subject}</Badge>
                  <Badge variant="outline">{question.chapter}</Badge>
                  <Badge variant="outline">{question.type}</Badge>
                  <Badge
                    variant="outline"
                    className={
                      question.difficulty === 'Hard'
                        ? 'border-destructive/40 text-destructive'
                        : question.difficulty === 'Medium'
                          ? 'border-primary/40 text-primary'
                          : ''
                    }
                  >
                    {question.difficulty}
                  </Badge>
                </div>
                <p className="font-medium">{question.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Demo question list in page state — the synced, taggable question bank arrives with the
        assessment API.
      </p>
    </div>
  );
}