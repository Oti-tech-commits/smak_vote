import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';
import type { Election } from '@/lib/types';

type ElectionSummary = Pick<Election, 'id' | 'status'>;

export async function GET(request: Request) {
  const profile = await requireProfile(request, 'admin');
  if (!profile) {
    return unauthorizedResponse();
  }

  const [students, votes, elections] = await Promise.all([
    supabaseServer.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseServer.from('votes').select('id', { count: 'exact', head: true }),
    supabaseServer.from('elections').select('id, status')
  ]);

  const electionRows = (elections.data ?? []) as ElectionSummary[];
  return NextResponse.json({
    students: students.count ?? 0,
    votes: votes.count ?? 0,
    elections: electionRows
  });
}
