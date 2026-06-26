export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const profile = await requireProfile(request);
  if (!profile) {
    return unauthorizedResponse();
  }
  return NextResponse.json({ id: profile.id, role: profile.role });
}
