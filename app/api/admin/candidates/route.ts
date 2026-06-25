import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { getUserProfileFromToken, requireProfile, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  const profile = await requireProfile(request, 'admin');
  if (!profile) {
    return unauthorizedResponse();
  }
  const { data, error } = await supabaseServer.from('candidates').select('id, student_name, class_name, manifesto, photo_url, position_id').order('student_name', { ascending: true });
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

  const formData = await request.formData();
  const student_name = formData.get('student_name')?.toString() ?? '';
  const class_name = formData.get('class_name')?.toString() ?? '';
  const manifesto = formData.get('manifesto')?.toString() ?? '';
  const position_id = formData.get('position_id')?.toString() ?? '';
  const photo = formData.get('photo');

  if (!student_name || !class_name || !manifesto || !position_id || !(photo instanceof File)) {
    return NextResponse.json({ error: 'All candidate fields and photo are required.' }, { status: 400 });
  }

  // Validate photo
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(photo.type)) {
    return NextResponse.json({ error: 'Invalid photo type. Only PNG, JPEG, WEBP, and GIF are allowed.' }, { status: 400 });
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (photo.size > maxSize) {
    return NextResponse.json({ error: 'Photo size exceeds the 2MB limit.' }, { status: 400 });
  }


  const fileName = `${crypto.randomUUID()}-${photo.name}`;
  const { data: uploadData, error: uploadError } = await supabaseServer.storage.from('candidate-photos').upload(fileName, photo.stream(), {
    contentType: photo.type,
    upsert: false
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseServer.storage.from('candidate-photos').getPublicUrl(uploadData.path);
  const photo_url = publicUrlData.publicUrl;

  const { data, error } = await supabaseServer.from('candidates').insert({ student_name, class_name, manifesto, position_id, photo_url }).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer.from('audit_logs').insert({ user_id: profile.id, action: 'candidate_creation', details: { candidate_id: data.id, student_name, position_id } });
  return NextResponse.json({ message: 'Candidate registered successfully.', candidate: data });
}
