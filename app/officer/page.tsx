'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AuthGuard } from '@/components/auth-guard';
import { authHeaders } from '@/lib/clientAuth';

interface OfficerStats {
  users: number;
  votes: number;
}

function OfficerDashboard() {
  const [stats, setStats] = useState<OfficerStats>({ users: 0, votes: 0 });

  useEffect(() => {
    async function loadStats() {
      const headers = await authHeaders();
      const response = await fetch('/api/officer/stats', { headers });
      if (response.ok) {
        setStats(await response.json());
      }
    }
    loadStats();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Election Officer Panel</h1>
        <p className="mt-2 text-slate-600">Monitor elections, verify students, and review turnout progress.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Verified Students</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats.users}</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Total Votes Cast</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats.votes}</p>
        </Card>
      </div>
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Realtime Turnout</h2>
        <p className="mt-3 text-slate-600">The number of votes cast is updated in real-time. For detailed official reports, please use the tools available in the main Admin Dashboard.</p>
      </Card>
    </section>
  );
}

export default function OfficerPage() {
  return (
    <AuthGuard allow={['officer', 'admin']}>
      <OfficerDashboard />
    </AuthGuard>
  );
}
