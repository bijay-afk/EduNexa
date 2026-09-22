import { AppShell, MobileAppNav } from '@/components/app/app-shell';
import AuthGate from '@/components/app/auth-gate';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="STUDENT">
      <AppShell>
        <MobileAppNav />
        {children}
      </AppShell>
    </AuthGate>
  );
}