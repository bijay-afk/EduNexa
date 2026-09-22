'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/api';

type Props =
  | { role?: undefined; children: React.ReactNode }
  | { role: 'STUDENT' | 'TEACHER' | 'ADMIN'; children: React.ReactNode };

export default function AuthGate({ role, children }: Props) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (role && session.user.role !== role && session.user.role !== 'ADMIN') {
      router.replace('/login');
      return;
    }
    setChecked(true);
  }, [role, router]);

  if (!checked) return null;
  return <>{children}</>;
}