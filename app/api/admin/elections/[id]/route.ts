import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserProfileFromToken, unauthorizedResponse } from '@/lib/auth';
import type { RouteParams } from '@/lib/types';

export const runtime = 'edge';


export async function PATCH(request: Request, { params }: { params: Promise<RouteParams> }) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const profile = await getUserProfileFromToken(token);
  if (!profile || profile.role !== 'admin') {
    return unauthorizedResponse();
  }

  const { status } = await request.json();
  const allowed = ['draft', 'open', 'closed', 'published'];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid election status.' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseServer.from('elections').select('status').eq('id', id).single();
  if (existingError || !existing) {
    return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
  }

  if (existing.status === 'published' && status !== 'published') {
    return NextResponse.json({ error: 'Published elections cannot be reopened or changed.' }, { status: 403 });
  }

  const { data, error } = await supabaseServer.from('elections').update({ status }).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer.from('audit_logs').insert({ user_id: profile.id, action: 'election_status_change', details: { election_id: id, status } });
  return NextResponse.json({ message: 'Election updated.', election: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<RouteParams> }) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const profile = await getUserProfileFromToken(token);
  if (!profile || profile.role !== 'admin') {
    return unauthorizedResponse();
  }

  const { error } = await supabaseServer.from('elections').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer.from('audit_logs').insert({ user_id: profile.id, action: 'election_deletion', details: { election_id: id } });
  return NextResponse.json({ message: 'Election deleted.' });
}
