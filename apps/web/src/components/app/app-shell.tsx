import Link from 'next/link';
import {
  Bell,
  Bookmark,
  BookOpen,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  Settings,
  Timer,
  User,
} from 'lucide-react';

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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
      <aside className="hidden w-56 shrink-0 lg:block" aria-label="Student navigation">
        <nav className="sticky top-20 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function MobileAppNav() {
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
      </nav>
    </details>
  );
}