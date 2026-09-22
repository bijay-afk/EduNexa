import AuthGate from '@/components/app/auth-gate';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate role="TEACHER">{children}</AuthGate>;
}