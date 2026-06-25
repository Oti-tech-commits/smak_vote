import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import type { VoteSubmissionRequest, CandidateSelection } from '@/lib/types';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const body = (await request.json()) as VoteSubmissionRequest;
  const ip = getClientIp(request);
  if (!rateLimit(`vote:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const authToken = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const { selectedCandidates, electionId, votingToken } = body;

  if (!selectedCandidates?.length || !electionId) {
    return NextResponse.json({ error: 'Missing vote data.' }, { status: 400 });
  }

  let userId: string | null = null;

  if (authToken) {
    const { data: userData, error: userError } = await supabaseServer.auth.getUser(authToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    userId = userData.user.id;
  }

  if (!userId) {
    if (!votingToken) {
      return NextResponse.json({ error: 'Authentication or voting token required.' }, { status: 401 });
    }
    const { data: tokenRow, error: tokenError } = await supabaseServer
      .from('voting_tokens')
      .select('student_id, election_id, expires_at, used')
      .eq('token', votingToken)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: 'Invalid voting token.' }, { status: 401 });
    }
    if (tokenRow.election_id !== electionId) {
      return NextResponse.json({ error: 'Voting token does not match election.' }, { status: 403 });
    }
    if (tokenRow.used) {
      return NextResponse.json({ error: 'This voting token has already been used.' }, { status: 403 });
    }
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Voting token has expired.' }, { status: 403 });
    }

    userId = tokenRow.student_id;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Could not determine voter identity.' }, { status: 401 });
  }

  const { data: existing, error: existingError } = await supabaseServer
    .from('voter_status')
    .select('id, has_voted')
    .eq('student_id', userId)
    .eq('election_id', electionId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing?.has_voted) {
    return NextResponse.json({ error: 'You have already voted in this election.' }, { status: 403 });
  }

  const candidateRecords = selectedCandidates.map((candidate: CandidateSelection) => ({
    election_id: electionId,
    position_id: candidate.positionId,
    candidate_id: candidate.candidateId
  }));

  const result = await supabaseServer.rpc('cast_ballot', {
    p_student_id: userId,
    p_election_id: electionId,
    p_votes: JSON.stringify(candidateRecords),
    p_voting_token: authToken ? null : (votingToken || null)
  });

  if (result.error) {
    // Check for unique constraint violation which indicates a re-vote attempt
    if (result.error.message.includes('duplicate key value violates unique constraint "voter_status_pkey"')) {
      return NextResponse.json({ error: 'You have already voted in this election.' }, { status: 403 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'You have successfully voted.' });
}
