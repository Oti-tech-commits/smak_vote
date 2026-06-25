import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  const { full_name, student_number, email, class_name, password } = await request.json();

  if (!full_name || !student_number || !email || !class_name || !password) {
    return NextResponse.json({ error: 'All registration fields are required.' }, { status: 400 });
  }

  const { data: existingProfile, error: existingProfileError } = await supabaseServer
    .from('profiles')
    .select('id')
    .or(`email.eq.${email},student_number.eq.${student_number}`)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: existingProfileError.message }, { status: 500 });
  }

  if (existingProfile) {
    return NextResponse.json({ error: 'A user with this email or student number already exists.' }, { status: 409 });
  }


  const { data, error } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, student_number, class_name, role: 'student' }
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Failed to create user.' }, { status: 500 });
  }

  const { error: profileError } = await supabaseServer.from('profiles').upsert({
    id: data.user.id,
    email,
    student_number,
    full_name,
    class_name,
    role: 'student'
  });

  if (profileError) {
    await supabaseServer.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Registration successful. Check your email to confirm your account.' });
}
