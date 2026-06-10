import { Card } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabaseServer';
import type { Election } from '@/lib/types';

type ElectionSummary = Pick<Election, 'id' | 'title' | 'status' | 'description' | 'start_time' | 'end_time'>;

export default async function ResultsPage() {
  const { data: elections, error } = await supabaseServer
    .from('elections')
    .select('id, title, status, description, start_time, end_time')
    .eq('status', 'published')
    .order('end_time', { ascending: false });

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <Card>
          <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
          <p className="mt-4 text-slate-600">Unable to load results at this time.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Published Results</h1>
        <p className="mt-2 text-slate-600">Review final election results and turnout summaries.</p>
      </div>
      {elections?.map((election: ElectionSummary) => (
        <Card key={election.id}>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{election.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{election.description}</p>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">Published</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Election Window</p>
                <p className="mt-2 text-slate-600">{new Date(election.start_time).toLocaleDateString()} – {new Date(election.end_time).toLocaleDateString()}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Status</p>
                <p className="mt-2 text-slate-600">{election.status}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </section>
  );
}
