import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';



export async function GET(request: Request) {
  const profile = await requireProfile(request, 'admin');
  if (!profile) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabaseServer.rpc('admin_stats_report').single() as { data: { students: number, votes: number, elections: {id: string, status: string}[] } | null, error: any };

  if (data?.elections) {
    const { data: electionDetails } = await supabaseServer.from('elections').select('id, title').in('id', data.elections.map(e => e.id));
    const titleMap = new Map(electionDetails?.map(e => [e.id, e.title]));
    data.elections = data.elections.map(e => ({ ...e, title: titleMap.get(e.id) ?? e.id }));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
