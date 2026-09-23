'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Bookmark,
  BookOpen,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  Timer,
  User,
  UserRound,
} from 'lucide-react';
import { clearSession, getSession } from '@/lib/api';

const nav = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/app/quiz', label: 'Quiz', icon: Timer },
  { href: '/app/exams', label: 'Mock Exams', icon: ClipboardList },
  { href: '/app/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/app/progress', label: 'Progress', icon: LineChart },
  { href: '/app/planner', label: 'Study Planner', icon: CalendarRange },
  { href: '/app/notifications', label: 'Notifications', icon: Bell },
  { href: '/app/profile', label: 'Profile', icon: User },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

function LogoutButton() {
  const router = useRouter();
  function onLogout() {
    clearSession();
    router.push('/login');
  }
  return (
    <button
      type="button"
      onClick={onLogout}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Sign out
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const session = getSession();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-12 px-6 py-12 lg:px-8">
      <aside className="hidden w-60 shrink-0 lg:block" aria-label="Student navigation">
        <nav className="sticky top-24 space-y-1">
          {session?.user.fullName ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border bg-card px-3 py-3 text-sm shadow-sm">
              <UserRound className="h-4 w-4 text-primary" aria-hidden />
              <span className="truncate font-medium">{session.user.fullName}</span>
            </div>
          ) : null}
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function MobileAppNav() {
  const router = useRouter();
  function onLogout() {
    clearSession();
    router.push('/login');
  }
  return (
    <details className="mb-4 lg:hidden">
      <summary className="cursor-pointer rounded-md border bg-card px-3 py-2 text-sm font-medium">
        Student menu
      </summary>
      <nav className="mt-2 grid grid-cols-2 gap-1 rounded-md border bg-card p-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </nav>
    </details>
  );
}