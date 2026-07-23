import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';



export async function GET(request: Request) {
  const profile = await requireProfile(request, 'admin');
  if (!profile) {
    return unauthorizedResponse();
  }

  // admin_stats_report returns: total_students, total_elections, total_candidates, total_votes
  const { data: rpcData, error } = await supabaseServer.rpc('admin_stats_report').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch all elections with their statuses
  const { data: elections, error: electionsError } = await supabaseServer
    .from('elections')
    .select('id, title, status')
    .order('created_at', { ascending: false });

  if (electionsError) {
    return NextResponse.json({ error: electionsError.message }, { status: 500 });
  }

  const typed = rpcData as { total_students: number; total_elections: number; total_candidates: number; total_votes: number } | null;

  return NextResponse.json({
    students: typed?.total_students ?? 0,
    votes: typed?.total_votes ?? 0,
    elections: (elections ?? []).map(e => ({ id: e.id, title: e.title, status: e.status }))
  });
}
