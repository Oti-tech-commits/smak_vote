import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserProfileFromToken, requireProfile, unauthorizedResponse } from '@/lib/auth';

export const runtime = 'edge';


export async function GET(request: Request) {
  const profile = await requireProfile(request, 'admin');
  if (!profile) {
    return unauthorizedResponse();
  }
  const { data, error } = await supabaseServer.from('elections').select('id, title, description, start_time, end_time, status, created_at').order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const profile = await getUserProfileFromToken(token);
  if (!profile || profile.role !== 'admin') {
    return unauthorizedResponse();
  }

  const { title, description, start_time, end_time } = await request.json();
  if (!title || !description || !start_time || !end_time) {
    return NextResponse.json({ error: 'All election fields are required.' }, { status: 400 });
  }

  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  if (endDate <= startDate) {
    return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
  }

  const { data, error } = await supabaseServer.from('elections').insert({ title, description, start_time, end_time, status: 'draft' }).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer.from('audit_logs').insert({ user_id: profile.id, action: 'election_creation', details: { election_id: data.id, title } });
  return NextResponse.json({ message: 'Election created successfully.', election: data });
}
