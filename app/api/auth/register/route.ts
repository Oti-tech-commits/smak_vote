import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { registerSchema } from '@/lib/validators';

/**
 * Student self-registration endpoint.
 * Students can create their own accounts with role='student'.
 * For admin/officer-managed registration, use /api/admin/students instead.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`register:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid registration data.',
        details: parsed.error.format()
      }, { status: 400 });
    }

    const { full_name, student_number, email, class_name, password } = parsed.data;

    // Check for existing profiles with same email or student number
    const { data: existingProfile, error: existingError } = await supabaseServer
      .from('profiles')
      .select('id')
      .or(`email.eq.${email},student_number.eq.${student_number}`)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: 'Database error while checking for duplicates.' }, { status: 500 });
    }

    if (existingProfile) {
      return NextResponse.json({
        error: 'A user with this email or student number already exists.'
      }, { status: 409 });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        student_number,
        class_name,
        role: 'student'
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }

    // Create profile entry
    const { error: profileError } = await supabaseServer.from('profiles').upsert({
      id: authData.user.id,
      email,
      student_number,
      full_name,
      class_name,
      role: 'student'
    });

    if (profileError) {
      // Rollback auth user creation
      await supabaseServer.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Audit log: student self-registration
    await supabaseServer.from('audit_logs').insert({
      user_id: authData.user.id,
      action: 'student_self_registration',
      details: { student_number, email, full_name, class_name }
    });

    return NextResponse.json({
      message: 'Student account created successfully. You can now log in.',
      userId: authData.user.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
