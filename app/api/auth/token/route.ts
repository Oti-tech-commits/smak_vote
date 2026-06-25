import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const { token } = await request.json();
  const ip = getClientIp(request);
  if (!rateLimit(`token:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Voting token is required.' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('voting_tokens')
    .select('id, election_id, student_id, expires_at, used')
    .eq('token', token)
    .maybeSingle();

  let isExpired = false;
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    isExpired = !Number.isNaN(expiresAt.valueOf()) && expiresAt < new Date();
  }

  if (error || !data || data.used || !data.student_id || isExpired) {
    return NextResponse.json({ error: 'Invalid or unusable voting token.' }, { status: 403 });
  }

  return NextResponse.json({ electionId: data.election_id, message: 'Voting token is valid.' });
}
