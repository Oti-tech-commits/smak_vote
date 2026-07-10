import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserProfileFromToken, unauthorizedResponse } from '@/lib/auth';

export const runtime = 'edge';



export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const profile = await getUserProfileFromToken(token);
  if (!profile || !['admin', 'officer'].includes(profile.role)) {
    return unauthorizedResponse();
  }

  const { full_name, student_number, email, class_name, password, role } = await request.json();
  const safeRole = role === 'officer' ? 'officer' : 'student';
  if (!full_name || !student_number || !email || !class_name || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const { data: userData, error: userError } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, student_number, class_name, role: safeRole }
  });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  await supabaseServer.from('profiles').upsert({
    id: userData.user.id,
    student_number,
    email,
    full_name,
    class_name,
    role: safeRole
  });

  await supabaseServer.from('audit_logs').insert({ user_id: profile.id, action: 'student_registration', details: { student_number, email, role: safeRole } });
  return NextResponse.json({ message: `${safeRole.charAt(0).toUpperCase() + safeRole.slice(1)} registered successfully.` });
}
