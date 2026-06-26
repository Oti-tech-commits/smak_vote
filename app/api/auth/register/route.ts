import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

import { requireProfile, unauthorizedResponse } from '@/lib/auth';
import { registerSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`register:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const caller = await requireProfile(request, ['admin', 'officer']);
  if (!caller) {
    return unauthorizedResponse();
  }

  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration data.' }, { status: 400 });
  }
  const { full_name, student_number, email, class_name, password, role } = parsed.data;

  // Only admins may create officer accounts; officers can register students only.
  let assignedRole: 'student' | 'officer' = 'student';
  if (role === 'officer') {
    if (caller.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can register officers.' }, { status: 403 });
    }
    assignedRole = 'officer';
  }

  // Check for duplicate email or student number
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

  // Create user in auth.users
  const { data, error } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: { full_name, student_number, class_name, role: assignedRole }
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Failed to create user.' }, { status: 500 });
  }

  // Create profile in public.profiles
  const { error: profileError } = await supabaseServer.from('profiles').upsert({
    id: data.user.id,
    email,
    student_number,
    full_name,
    class_name,
    role: assignedRole
  });

  if (profileError) {
    // If profile creation fails, roll back the auth user creation
    await supabaseServer.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const label = assignedRole === 'officer' ? 'Officer' : 'Student';
  return NextResponse.json({ message: `${label} account created successfully. The account can sign in immediately with the email and password provided.` });
}
