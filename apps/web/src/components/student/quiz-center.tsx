'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@edunexa/ui';

export function QuizCenter() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-1 py-12 text-center text-sm text-muted-foreground">
          <Sparkles className="mb-1 h-6 w-6" aria-hidden />
          <p className="font-medium text-foreground">No quizzes available yet</p>
          <p>Assigned practice quizzes will appear here with instant feedback.</p>
        </CardContent>
      </Card>
    </div>
  );
}