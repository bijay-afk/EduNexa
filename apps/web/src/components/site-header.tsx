import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Button } from '@class10/ui';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/curriculum', label: 'Curriculum' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/features', label: 'Features' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
          <span>Class 10</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button size="sm">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}