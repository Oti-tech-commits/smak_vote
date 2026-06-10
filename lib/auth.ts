import { supabaseServer } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

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
