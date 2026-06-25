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


  return NextResponse.json(officerStats);
}
