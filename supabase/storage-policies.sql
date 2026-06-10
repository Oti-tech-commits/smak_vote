-- Supabase Storage policies for candidate photo uploads
-- Create a public bucket named 'candidate-photos' in the Supabase dashboard.

-- The storage bucket should allow authenticated users to upload candidate photo objects.
-- Use Supabase Storage policies to prevent unauthorized access.

create policy "Allow authenticated uploads to candidate-photos" on storage.objects
  for insert with check (auth.role() = 'authenticated' and bucket_id = 'candidate-photos');

create policy "Allow public read for candidate-photos" on storage.objects
  for select using (bucket_id = 'candidate-photos');

create policy "Allow delete by admin for candidate-photos" on storage.objects
  for delete using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin') and bucket_id = 'candidate-photos');
