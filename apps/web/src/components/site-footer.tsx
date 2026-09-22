import Link from 'next/link';

const cols = [
  {
    title: 'Platform',
    links: [
      { href: '/about', label: 'About' },
      { href: '/features', label: 'Features' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Use' },
    ],
  },
  {
    title: 'For students',
    links: [
      { href: '/app', label: 'Dashboard' },
      { href: '/app/subjects', label: 'Subjects' },
      { href: '/app/quiz', label: 'Quizzes' },
      { href: '/app/exams', label: 'Mock Exams' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {cols.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
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
        <p className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Class 10 Learning Platform. Content is aligned to the approved
          grade-10 curriculum.
        </p>
      </div>
    </footer>
  );
}