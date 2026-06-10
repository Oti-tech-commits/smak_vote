import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  const { data: election, error } = await supabaseServer
    .from('elections')
    .select('id, title, description, start_time, end_time, status')
    .eq('status', 'open')
    .order('start_time', { ascending: true })
    .limit(1)
    .single();

  if (error || !election) {
    return NextResponse.json({ error: 'No active election found.' }, { status: 404 });
  }

  const { data: positions, error: posError } = await supabaseServer
    .from('positions')
    .select('id, title, max_votes, candidates(id, student_name, class_name, photo_url, manifesto)')
    .eq('election_id', election.id)
    .order('id', { ascending: true });

  if (posError) {
    return NextResponse.json({ error: posError.message }, { status: 500 });
  }

  return NextResponse.json({ election, positions });
}
