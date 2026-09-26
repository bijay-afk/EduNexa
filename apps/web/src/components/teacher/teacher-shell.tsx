'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Archive, GraduationCap, LayoutDashboard, Library, ListTodo, LogOut, UserRound, Wand2 } from 'lucide-react';
import { clearSession, getSession } from '@/lib/api';

const nav = [
  { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teacher/question-bank', label: 'Question bank', icon: Library },
  { href: '/teacher/question-generator', label: 'Question generator', icon: Wand2 },
  { href: '/teacher/archive', label: 'SEE archive', icon: Archive },
  { href: '/teacher/archive/mappings', label: 'Mapping queue', icon: ListTodo },
];

export function TeacherShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();

  function onSignOut() {
    clearSession();
    router.push('/login');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
      <aside className="hidden w-56 shrink-0 lg:block" aria-label="Teacher navigation">
        <div className="sticky top-20 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            {session?.user.fullName ? (
              <>
                <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="truncate font-medium">{session.user.fullName}</span>
              </>
            ) : (
              <span className="flex items-center gap-2 font-medium">
                <GraduationCap className="h-4 w-4 text-primary" aria-hidden />
                Teacher area
              </span>
            )}
          </div>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                pathname === item.href ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 lg:hidden">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <span>Teacher workspace</span>
            {session?.user.fullName ? <span className="text-muted-foreground">{session.user.fullName}</span> : null}
          </div>
          <nav className="grid grid-cols-1 gap-1 rounded-md border bg-card p-2 sm:grid-cols-3" aria-label="Teacher">
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
              onClick={onSignOut}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}