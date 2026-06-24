import { supabaseServer } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export function getBearerToken(request: Request): string | null {
  return request.headers.get('authorization')?.replace('Bearer ', '') || null;
}

export async function getUserProfileFromToken(token: string | null) {
  if (!token) {
    return null;
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  const { data: profile } = await supabaseServer.from('profiles').select('id, role').eq('id', data.user.id).single();
  if (!profile) {
    return null;
  }

  return { id: data.user.id, role: profile.role };
}

export function requireRole(role: string | string[]) {
  const roles = Array.isArray(role) ? role : [role];
  return async (token: string | null) => {
    if (!token) {
      return null;
    }
    const profile = await getUserProfileFromToken(token);
    if (!profile || !roles.includes(profile.role)) {
      return null;
    }
    return profile;
  };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function requireProfile(request: Request, roles?: string | string[]) {
  const profile = await getUserProfileFromToken(getBearerToken(request));
  if (!profile) {
    return null;
  }
  if (roles) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(profile.role)) {
      return null;
    }
  }
  return profile;
}

export type VoterAccess =
  | { kind: 'user'; id: string; role: string }
  | { kind: 'token'; electionId: string };

export async function getVoterAccess(request: Request): Promise<VoterAccess | null> {
  const profile = await getUserProfileFromToken(getBearerToken(request));
  if (profile) {
    return { kind: 'user', id: profile.id, role: profile.role };
  }

  const votingToken = request.headers.get('x-voting-token');
  if (votingToken) {
    const { data } = await supabaseServer
      .from('voting_tokens')
      .select('election_id, expires_at')
      .eq('token', votingToken)
      .single();
    if (data && (!data.expires_at || new Date(data.expires_at) >= new Date())) {
      return { kind: 'token', electionId: data.election_id };
    }
  }

  return null;
}
