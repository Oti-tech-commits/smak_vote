import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const profile = await requireProfile(request, ['admin', 'officer']);
  if (!profile) {
    return unauthorizedResponse();
  }

  // Fetch audit logs with the associated user profile details
  const { data, error } = await supabaseServer
    .from('audit_logs')
    .select('id, action, details, created_at, user_id, profiles(full_name, email, role)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
