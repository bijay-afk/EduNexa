import { AppShell, MobileAppNav } from '@/components/app/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <MobileAppNav />
      {children}
    </AppShell>
  );
}