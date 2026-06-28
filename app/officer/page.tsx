'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AuthGuard } from '@/components/auth-guard';
import { authHeaders } from '@/lib/clientAuth';
import { StudentImportForm } from '@/components/student-import-form';

interface OfficerStats {
  users: number;
  votes: number;
  turnout?: {
    votes_cast: number;
    eligible_voters: number;
  };
}

function OfficerDashboard() {
  const [stats, setStats] = useState<OfficerStats>({ users: 0, votes: 0 });

  async function loadStats() {
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/officer/stats', { headers });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error('Failed to load officer stats:', error);
    }
  }

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 space-y-8">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Election Officer Panel</h1>
            <p className="mt-2 text-slate-600">Monitor elections, verify students, and review turnout progress.</p>
          </div>
          <div className="sm:flex sm:items-center sm:justify-end">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Register Student
            </Link>
          </div>
        </div>
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
        {stats.turnout ? (
          <div className="mt-3">
            <p className="text-4xl font-semibold text-slate-900">{stats.turnout.votes_cast} <span className="text-xl font-medium text-slate-600">/ {stats.turnout.eligible_voters}</span></p>
            <p className="mt-1 text-sm text-slate-500">({stats.turnout.eligible_voters > 0 ? ((stats.turnout.votes_cast / stats.turnout.eligible_voters) * 100).toFixed(1) : '0.0'}%)</p>
          </div>
        ) : (
          <p className="mt-3 text-slate-600">Loading turnout…</p>
        )}
      </Card>
      
      <StudentImportForm onSuccess={loadStats} />

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
