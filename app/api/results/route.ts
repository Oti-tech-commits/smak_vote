export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
// getVoterAccess is intentionally not used for published results (public).

import type { Election, Position, Candidate } from '@/lib/types';

interface PositionWithResults extends Position {
  candidates: (Candidate & { vote_count: number })[];
}

interface ElectionWithResults extends Election {
  positions: PositionWithResults[];
  turnout: {
    voted: number;
    total: number;
  };
}

export async function GET(request: Request) {
  // Published results are public.
  // We intentionally do NOT block on missing voter access.



  const { data: elections, error } = await supabaseServer
    .from('elections')
    .select('id, title, status, description, start_time, end_time')
    .eq('status', 'published')
    .order('end_time', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const electionsWithResults: ElectionWithResults[] = [];

  for (const election of elections ?? []) {
    const { data: positions, error: posError } = await supabaseServer
      .from('positions')
      .select('id, title, max_votes, candidates(id, student_name, class_name, photo_url, manifesto, votes(count))')
      .eq('election_id', election.id)
      .order('id', { ascending: true });

    if (posError) {
      return NextResponse.json({ error: posError.message }, { status: 500 });
    }

    const { count: voted } = await supabaseServer
      .from('voter_status')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', election.id)
      .eq('has_voted', true);

    const { count: total } = await supabaseServer
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    electionsWithResults.push({
      ...(election as any),
      positions: (positions as any) ?? [],
      turnout: { voted: voted ?? 0, total: total ?? 0 }
    } as ElectionWithResults);
  }


  return NextResponse.json({ elections: electionsWithResults });
}
