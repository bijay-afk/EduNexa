'use client';

import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@edunexa/ui';

interface DemoQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

const questions: DemoQuestion[] = [
  {
    question: 'Solve: x² − 5x + 6 = 0',
    options: ['x = 2 or x = 3', 'x = 1 or x = 6', 'x = −2 or x = −3', 'x = 0 or x = 5'],
    answer: 0,
    explanation: 'The quadratic factorises to (x − 2)(x − 3) = 0.',
  },
  {
    question: 'The discriminant of ax² + bx + c = 0 is:',
    options: ['b² − 4ac', 'b² + 4ac', '4ac − b²', '−b / 2a'],
    answer: 0,
    explanation: 'D = b² − 4ac decides the nature of the roots.',
  },
  {
    question: 'The quadratic formula for ax² + bx + c = 0 is:',
    options: ['x = (−b ± √(b² − 4ac)) / 2a', 'x = (b ± √(b² − 4ac)) / 2a', 'x = −b / a', 'x = c / a'],
    answer: 0,
    explanation: 'It follows directly from completing the square on the general quadratic.',
  },
  {
    question: 'The sum of the roots of x² − 5x + 6 = 0 is:',
    options: ['5', '6', '−5', '1'],
    answer: 0,
    explanation: 'Sum of roots = −b/a = 5.',
  },
  {
    question: 'Factorise: x² − 9',
    options: ['(x − 3)(x + 3)', '(x − 3)²', '(x + 3)²', '(x − 9)(x + 1)'],
    answer: 0,
    explanation: 'Difference of two squares: x² − 3².',
  },
];

export function QuizCenter() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const answeredCount = answers.filter((a) => a !== null).length;

  function choose(option: number) {
    if (selected !== null) return;
    setSelected(option);
    setAnswers((prev) => prev.map((a, i) => (i === index ? option : a)));
  }

  function next() {
    if (index < questions.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setSelected(answers[nextIndex]);
      return;
    }
    setFinished(true);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setAnswers(questions.map(() => null));
    setFinished(false);
  }

  const score = answers.reduce<number>((total, answer, i) => {
    return answer === questions[i].answer ? total + 1 : total;
  }, 0);

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Algebra — sample quiz</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You scored <strong>{score}</strong> / {questions.length} ({pct}%).
          </p>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const picked = answers[i];
            const correct = picked === q.answer;
            return (
              <Card key={q.question}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-medium">{q.question}</CardTitle>
                    {correct ? (
                      <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/5 text-primary">
                        <Check className="h-3 w-3" aria-hidden /> Correct
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/5 text-destructive">
                        <X className="h-3 w-3" aria-hidden /> {picked === null ? 'Skipped' : 'Incorrect'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{q.explanation}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
        <Button onClick={restart}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Algebra — sample quiz</h2>
        <Badge variant="secondary">
          Question {index + 1} of {questions.length}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{current.question}</CardTitle>
          <CardDescription>Choose the best answer ({answeredCount} answered).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {current.options.map((option, i) => {
              const isSelected = selected === i;
              const isCorrect = selected !== null && i === current.answer;
              const isWrong = selected === i && i !== current.answer;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={selected !== null}
                  onClick={() => choose(i)}
                  className={`flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                    isCorrect
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : isWrong
                        ? 'border-destructive/40 bg-destructive/5 text-destructive'
                        : isSelected
                          ? 'border-input bg-muted'
                          : 'bg-background hover:border-primary/50'
                  }`}
                >
                  <span>
                    {String.fromCharCode(65 + i)}. {option}
                  </span>
                  {isCorrect ? <Check className="h-4 w-4" aria-hidden /> : null}
                  {isWrong ? <X className="h-4 w-4" aria-hidden /> : null}
                </button>
              );
            })}
          </div>

          {selected !== null ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {selected === current.answer
                ? 'Correct.'
                : `Not quite. ${current.explanation}`}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end">
            <Button onClick={next} disabled={selected === null}>
              {index === questions.length - 1 ? 'See results' : 'Next question'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Demo assessment with sample questions — live attempts hook up to the assessment API in a
        later phase.
      </p>
    </div>
  );
}