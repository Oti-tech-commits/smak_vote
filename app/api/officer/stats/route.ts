

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const profile = await requireProfile(request, ['admin', 'officer']);
  if (!profile) {
    return unauthorizedResponse();
  }

  const { data: stats, error } = await supabaseServer.rpc('admin_stats_report').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Adapt the data for the officer dashboard
  const typedStats = stats as { students: number; votes: number };
  const officerStats = {
    users: typedStats.students,
    votes: typedStats.votes
  };

  // Officer turnout: compute eligible voters and votes cast from voting status.
  // Assumes voter_status.has_voted tracks whether the student has already voted.
  // Scope turnout to the current open election.
  let activeElection = await supabaseServer
    .from('elections')
    .select('id')
    .eq('status', 'open')
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (activeElection.error || !activeElection.data?.id) {
    // Fall back to most recent election
    activeElection = await supabaseServer
      .from('elections')
      .select('id')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  const electionId = activeElection.data?.id || null;
  let votesCast = 0;

  if (electionId) {
    const { data: electionTurnoutRows, error: turnoutError } = await supabaseServer
      .from('voter_status')
      .select('has_voted')
      .eq('election_id', electionId)
      .eq('has_voted', true);

    if (turnoutError) {
      return NextResponse.json({ error: turnoutError.message }, { status: 500 });
    }
    votesCast = electionTurnoutRows?.length ?? 0;
  }


  // Eligible voters = total student profiles.
  const { count: eligibleVoters, error: eligibleError } = await supabaseServer
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  if (eligibleError) {
    return NextResponse.json({ error: eligibleError.message }, { status: 500 });
  }

  return NextResponse.json({
    ...officerStats,
    turnout: {
      votes_cast: votesCast,
      eligible_voters: eligibleVoters ?? 0
    }
  });
}


