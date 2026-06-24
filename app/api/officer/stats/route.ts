import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const profile = await requireProfile(request, ['officer', 'admin']);
  if (!profile) {
    return unauthorizedResponse();
  }

  const [verifiedStudents, positions] = await Promise.all([
    supabaseServer.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
    supabaseServer.from('positions').select('id', { count: 'exact', head: true })
  ]);

  return NextResponse.json({
    users: verifiedStudents.count ?? 0,
    positions: positions.count ?? 0
  });
}
