import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getVoterAccess, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const access = await getVoterAccess(request);
  if (!access) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabaseServer
    .from('elections')
    .select('id, title, status, description, start_time, end_time')
    .eq('status', 'published')
    .order('end_time', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ elections: data ?? [] });
}
