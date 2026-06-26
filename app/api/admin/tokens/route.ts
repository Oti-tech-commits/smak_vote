import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserProfileFromToken, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const profile = await getUserProfileFromToken(token);
  if (!profile || profile.role !== 'admin') {
    return unauthorizedResponse();
  }

  const { data, error } = await supabaseServer
    .from('voting_tokens')
    .select('id, token, election_id, student_id, expires_at, used, created_at')
    .order('created_at', { ascending: false });

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

  const { election_id, student_number, email, expires_at } = await request.json();
  if (!election_id) {
    return NextResponse.json({ error: 'Election ID is required.' }, { status: 400 });
  }
  if (!student_number && !email) {
    return NextResponse.json({ error: 'Student number or email is required for a usable voting token.' }, { status: 400 });
  }

  let student_id: string | null = null;
  if (student_number || email) {
    const query = supabaseServer.from('profiles').select('id').limit(1);
    const profileQuery = student_number ? query.eq('student_number', student_number) : query.eq('email', email);
    const { data: profileRow, error: profileError } = await profileQuery.single();
    if (profileError || !profileRow) {
      return NextResponse.json({ error: 'Student or officer profile not found.' }, { status: 404 });
    }
    student_id = profileRow.id;
  }

  const tokenValue = crypto.randomUUID();
  const { data, error }.from('voting_tokens').insert({
    token: tokenValue,
    election_id,
    student_id,
    expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    used: false
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer.from('audit_logs').insert({ user_id: profile.id, action: 'voting_token_creation', details: { token_id: data.id, election_id, student_id } });
  return NextResponse.json({ message: 'Voting token created successfully.', token: data });
}
