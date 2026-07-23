import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';




export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile(request, 'admin');
  if (!profile) {
    return unauthorizedResponse();
  }

  const { error } = await supabaseServer.from('voting_tokens').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer.from('audit_logs').insert({ user_id: profile.id, action: 'voting_token_deletion', details: { token_id: id } });
  return NextResponse.json({ message: 'Voting token deleted.' });
}
