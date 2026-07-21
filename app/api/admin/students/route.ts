import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';
import { registerSchema } from '@/lib/validators';

// Resolving the orphaned `/api/admin/students` route by choosing option (b):
// We keep it and point `app/register/page.tsx` at `/api/admin/students`,
// adding a role selector (student/officer) since `/api/auth/register` only
// creates `student` while `/api/admin/students` can create both `student` and `officer`.




export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`admin_register:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  const caller = await requireProfile(request, ['admin', 'officer']);
  if (!caller) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration data.' }, { status: 400 });
  }
  const { full_name, student_number, email, class_name, password } = parsed.data;
  
  // The role defaults to 'student' but can be 'officer' if specified by caller.
  const role = body.role === 'officer' ? 'officer' : 'student';

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
    user_metadata: { full_name, student_number, class_name, role }
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
    role
  });

  if (profileError) {
    // If profile creation fails, roll back the auth user creation
    await supabaseServer.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Write an audit log entry
  await supabaseServer.from('audit_logs').insert({
    user_id: caller.id,
    action: role === 'officer' ? 'officer_creation' : 'student_creation',
    details: { student_number, email, full_name, class_name, target_id: data.user.id }
  });

  return NextResponse.json({ message: `${role === 'officer' ? 'Officer' : 'Student'} account created successfully.` });
}
