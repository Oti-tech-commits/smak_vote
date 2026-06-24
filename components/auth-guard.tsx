'use client';

import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { dashboardPathForRole, getSessionProfile } from '@/lib/clientAuth';
import type { UserRole } from '@/lib/types';

type GuardStatus = 'loading' | 'authorized' | 'denied';

export function AuthGuard({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<GuardStatus>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      const profile = await getSessionProfile();
      if (!active) {
        return;
      }
      if (!profile) {
        setStatus('denied');
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}` as Route);
        return;
      }
      if (!allow.includes(profile.role)) {
        setStatus('denied');
        router.replace(dashboardPathForRole(profile.role));
        return;
      }
      setStatus('authorized');
    })();
    return () => {
      active = false;
    };
  }, [allow, pathname, router]);

  if (status !== 'authorized') {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <Card>
          <p className="text-sm text-slate-600">
            {status === 'loading' ? 'Verifying your access…' : 'Redirecting to login…'}
          </p>
        </Card>
      </section>
    );
  }

  return <>{children}</>;
}
