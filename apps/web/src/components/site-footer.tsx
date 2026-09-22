import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

const cols = [
  {
    title: 'Platform',
    links: [
      { href: '/about', label: 'About' },
      { href: '/features', label: 'Features' },
      { href: '/curriculum', label: 'Curriculum' },
      { href: '/notices', label: 'Notices' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'For students',
    links: [
      { href: '/app', label: 'Dashboard' },
      { href: '/app/subjects', label: 'Subjects' },
      { href: '/app/quiz', label: 'Quizzes' },
      { href: '/app/exams', label: 'Mock exams' },
      { href: '/app/planner', label: 'Study planner' },
    ],
  },
  {
    title: 'For teachers',
    links: [
      { href: '/teacher', label: 'Teacher workspace' },
      { href: '/teacher/question-bank', label: 'Question bank' },
      { href: '/teacher/question-generator', label: 'Question generator' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/faq', label: 'Help & FAQs' },
      { href: '/contact', label: 'Contact support' },
      { href: '/contact', label: 'Give feedback' },
      { href: '/privacy', label: 'Privacy policy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
              <span>EduNexa</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Syllabus-structured learning for Class 10 — notes, quizzes, mock exams, and teacher
              question generation grounded in the approved curriculum.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            {cols.map((col) => (
              <div key={col.title}>
                <p className="mb-3 text-sm font-semibold">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={`${col.title}-${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} EduNexa. Content is aligned to the approved Class 10 curriculum.
        </p>
      </div>
    </footer>
  );
}