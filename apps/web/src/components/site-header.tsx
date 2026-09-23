'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GraduationCap, LayoutDashboard, Menu, UserPlus, X } from 'lucide-react';
import { Button } from '@edunexa/ui';
import { getSession, type AuthSession } from '@/lib/api';
import { ThemeToggle } from './theme-toggle';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/curriculum', label: 'Curriculum' },
  { href: '/notices', label: 'Notices' },
  { href: '/features', label: 'Features' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setHydrated(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const dashboardHref = session?.user.role === 'TEACHER' ? '/teacher' : '/app';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
          <span>EduNexa</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground ${
                pathname === item.href ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {!hydrated ? (
            <span className="h-8 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
          ) : session ? (
            <Button size="sm">
              <Link href={dashboardHref}>
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm">
                <UserPlus className="h-4 w-4" aria-hidden />
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t bg-background lg:hidden">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-xs text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
          <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {session ? (
                <Button size="sm" className="col-span-2">
                  <Link href={dashboardHref}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden />
                    Open dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button size="sm">
                    <Link href="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}