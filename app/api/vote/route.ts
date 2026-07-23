import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { voteSubmissionSchema } from '@/lib/validators';
import { getBearerToken } from '@/lib/auth';

/**
 * Hardened Vote Submission Route
 * 1. Distributed Rate Limiting (via IP)
 * 2. CSRF Protection (Custom Header check)
 * 3. Atomic Transactional Logic (PostgreSQL RPC)
 * 4. Temporal Decoupling (Anonymity enhancement)
 */
export async function POST(request: Request) {
  // 1. Rate Limiting
  const ip = getClientIp(request);
  if (!rateLimit(`vote:${ip}`, 5, 60_000)) { // Tightened limit to 5 per minute
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  // 2. CSRF Protection
  // Ensure the request is coming from our own frontend by checking a custom header
  // that browsers don't send automatically on cross-site requests.
  if (!request.headers.get('x-requested-with')) {
    return NextResponse.json({ error: 'Security validation failed (CSRF).' }, { status: 403 });
  }

  try {
    // 3. Request Validation (Zod)
    const json = await request.json();
    const result = voteSubmissionSchema.safeParse(json);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid vote data.', 
        details: result.error.format() 
      }, { status: 400 });
    }

    const { electionId, selectedCandidates, votingToken } = result.data;
    const authToken = getBearerToken(request);
    
    let studentId: string | null = null;

    // 4. Identity Determination
    if (authToken) {
      const { data: userData, error: userError } = await supabaseServer.auth.getUser(authToken);
      if (userError || !userData?.user) {
        return NextResponse.json({ error: 'Authentication expired. Please log in again.' }, { status: 401 });
      }
      studentId = userData.user.id;
    }

    // 5. Atomic Voting via RPC
    // All validation (Token, Election Status, Window, Max Votes, Double Voting)
    // is now handled inside a single PostgreSQL transaction for atomicity.
    const rpcResult = await supabaseServer.rpc('cast_ballot', {
      p_student_id: studentId, // Can be null if using token, RPC handles lookup
      p_election_id: electionId,
      p_votes: JSON.stringify(selectedCandidates.map(c => ({
        candidate_id: c.candidateId,
        position_id: c.positionId
      }))),
      p_voting_token: votingToken || null
    });

    if (rpcResult.error) {
      const msg = rpcResult.error.message.toLowerCase();
      // Handle known error cases to provide user-friendly feedback
      if (msg.includes('already participated')) return NextResponse.json({ error: 'You have already voted in this election.' }, { status: 403 });
      if (msg.includes('not currently open')) return NextResponse.json({ error: 'This election is not open for voting.' }, { status: 403 });
      if (msg.includes('invalid, already used, or expired voting token')) return NextResponse.json({ error: 'The voting token provided is invalid or has already been used.' }, { status: 403 });
      
      console.error('RPC Error:', rpcResult.error);
      return NextResponse.json({ error: 'An error occurred while casting your ballot. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Ballot cast successfully.',
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    console.error('Route Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
