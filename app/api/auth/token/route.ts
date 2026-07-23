import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * Validates a single-use voting token.
 * Token must:
 *  - Exist in the database
 *  - Not be marked as used
 *  - Not be expired (if expires_at is set)
 *  - Be linked to a student (student_id must exist)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`token:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Voting token is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('voting_tokens')
      .select('id, election_id, student_id, expires_at, used')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error('Token lookup error:', error);
      return NextResponse.json({ error: 'Unable to validate voting token.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Invalid voting token.' }, { status: 403 });
    }

    // Check if token has already been used
    if (data.used) {
      return NextResponse.json({ error: 'This voting token has already been used.' }, { status: 403 });
    }

    // Check if token is linked to a student
    if (!data.student_id) {
      return NextResponse.json({ error: 'Invalid voting token configuration.' }, { status: 403 });
    }

    // Check if token has expired
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
        return NextResponse.json({ error: 'This voting token has expired.' }, { status: 403 });
      }
    }

    return NextResponse.json({
      electionId: data.election_id,
      message: 'Voting token is valid.'
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
