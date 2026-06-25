import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: 'Voting token is required.' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('voting_tokens')
    .select('id, election_id, student_id, expires_at, used')
    .eq('token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid voting token.' }, { status: 404 });
  }

  if (data.used) {
    return NextResponse.json({ error: 'This voting token has already been used.' }, { status: 403 });
  }

  if (!data.student_id) {
    return NextResponse.json({ error: 'This voting token is not assigned to a voter.' }, { status: 403 });
  }

  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    if (!Number.isNaN(expiresAt.valueOf()) && expiresAt < new Date()) {
      return NextResponse.json({ error: 'Voting token expired.' }, { status: 403 });
    }
  }

  return NextResponse.json({ electionId: data.election_id, message: 'Voting token is valid.' });
}
