import { Card } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabaseServer';
import { AdminPanel } from '@/components/admin-panel';
import type { Election } from '@/lib/types';

type ElectionSummary = Pick<Election, 'id' | 'status'>;

async function fetchAdminStats() {
  const [students, votes, elections] = await Promise.all([
    supabaseServer.from('profiles').select('id', { count: 'exact' }),
    supabaseServer.from('votes').select('id', { count: 'exact' }),
    supabaseServer.from('elections').select('id, status')
  ]);

  return { students: students.count ?? 0, votes: votes.count ?? 0, elections: elections.data ?? [] };
}

export default async function AdminPage() {
  const stats = await fetchAdminStats();
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-2 text-slate-600">Manage prefect elections, student registrations, and audit reports.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Total Students</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats.students}</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Votes Cast</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats.votes}</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Active Elections</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats.elections.filter((e: ElectionSummary) => e.status === 'open').length}</p>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">Export Reports</h2>
          <p className="mt-3 text-slate-600">Download audit and turnout data for school records.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/api/reports/pdf" className="inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Download PDF Summary</a>
            <a href="/api/reports/excel" className="inline-flex rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50">Download Excel Turnout</a>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">Election Status</h2>
          <div className="mt-4 space-y-3">
            {stats.elections.map((election: ElectionSummary) => (
              <div key={election.id} className="rounded-3xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm font-semibold text-slate-800">{election.id}</p>
                <p className="text-sm text-slate-600">Status: {election.status}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <AdminPanel />
    </section>
  );
}
