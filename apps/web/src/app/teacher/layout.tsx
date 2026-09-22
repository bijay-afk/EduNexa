import AuthGate from '@/components/app/auth-gate';
import { TeacherShell } from '@/components/teacher/teacher-shell';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="TEACHER">
      <TeacherShell>{children}</TeacherShell>
    </AuthGate>
  );
}