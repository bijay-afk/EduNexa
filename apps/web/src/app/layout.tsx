import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

// MasterClass-style editorial display serif for headlines and numerals.
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'EduNexa — Class 10 Learning Platform',
    template: '%s · EduNexa',
  },
  description:
    'EduNexa — syllabus-structured learning for Class 10: notes, examples, quizzes, mock exams, and teacher question generation grounded in the approved curriculum.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={display.variable}>
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}