import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`lookup:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }
  const { student_number } = await request.json();

  if (!student_number || typeof student_number !== 'string') {
    return NextResponse.json({ error: 'Student number is required.' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('profiles')
    .select('email')
    .eq('student_number', student_number)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Unable to look up student number.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Student number not found.' }, { status: 404 });
  }

  return NextResponse.json({ email: data.email });
}
