import type { Metadata } from 'next';
import { NoticeBoard } from '@/components/marketing/notice-board';

export const metadata: Metadata = { title: 'Notices' };

export default function NoticesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Notices</h1>
      <p className="mt-3 text-muted-foreground">
        Exam schedules, results, newly published notes, and platform updates for Class 10.
      </p>
      <div className="mt-8">
        <NoticeBoard />
      </div>
    </div>
  );
}