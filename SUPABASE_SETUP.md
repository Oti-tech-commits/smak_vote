# SUPABASE SETUP GUIDE

## Prerequisites

1. Supabase account (https://supabase.com)
2. Your project URL and API keys
3. Git installed locally

## Step 1: Create Supabase Project

1. Log into Supabase Dashboard
2. Click "New Project"
3. Select your organization
4. Enter project name: `st-marks-voting`
5. Enter database password (save this!)
6. Select region closest to your school
7. Wait for project initialization (2-5 minutes)

## Step 2: Get Your Credentials

From the Supabase Dashboard:

1. Go to Project Settings → API
2. Copy:
   - Project URL: `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Public Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key: `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

3. Go to Project Settings → Database → Connection String
4. Copy PostgreSQL connection string if needed

## Step 3: Create Storage Bucket

1. In Supabase Dashboard, go to Storage → Buckets
2. Click "New bucket"
3. Name: `candidate-photos`
4. Access: Private
5. Click Create

## Step 4: Run Migrations

### Option A: Using Supabase CLI

```bash
npm install -g supabase
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Option B: Using Supabase Dashboard SQL Editor

1. Go to SQL Editor
2. Click "New Query"
3. Copy contents of `supabase/migrations/0001_init.sql`
4. Paste into editor
5. Click "Run"
6. Repeat for `supabase/migrations/0002_fix_voting_tokens.sql`

## Step 5: Configure Storage Security

In Supabase Dashboard → Storage → candidate-photos → Policies:

Add a policy for public read access:

```sql
CREATE POLICY "Public read access on candidate-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'candidate-photos');
```

Add a policy for authenticated uploads:

```sql
CREATE POLICY "Authenticated uploads to candidate-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'candidate-photos' AND owner = auth.uid());
```

## Step 6: Create Initial Admin User

Using the Supabase Dashboard Authentication tab:

1. Click "Add user"
2. Email: `admin@stmark.com` (or your admin email)
3. Password: Use a strong password
4. Click "Create user"

Then run the seed script:

```bash
SEED_ADMIN_EMAIL=admin@stmark.com \
SEED_ADMIN_PASSWORD=YourPassword123 \
SEED_ADMIN_STUDENT_NUMBER=ADMIN001 \
npm run supabase:seed
```

## Step 7: Set Environment Variables

Create `.env.local` in project root:

```
SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SEED_ADMIN_EMAIL=admin@stmark.com
SEED_ADMIN_PASSWORD=YourPassword123
SEED_ADMIN_STUDENT_NUMBER=ADMIN001
```

## Step 8: Test Connection

```bash
npm run dev
```

Visit http://localhost:3000 and test:

1. Admin login with email/password
2. Student registration
3. Election creation (admin only)

## Troubleshooting

### Connection errors

- Verify `NEXT_PUBLIC_SUPABASE_URL` format
- Check that anon key has correct permissions
- Ensure project is not paused

### Auth errors

- Confirm email confirmation is enabled (if required)
- Check user roles in `profiles` table
- Verify RLS policies are enabled

### Storage errors

- Confirm bucket exists and is named exactly `candidate-photos`
- Check bucket policies allow uploads
- Verify authenticated user has correct permissions

## Production Deployment

Before deploying to production:

1. **Update Supabase Settings:**
   - Enable email confirmation
   - Configure custom SMTP if available
   - Set password reset template
   - Enable 2FA for admin accounts

2. **Security Checklist:**
   - ✓ RLS policies enabled on all tables
   - ✓ Voting tokens expire properly
   - ✓ Audit logs immutable
   - ✓ Storage bucket is private
   - ✓ Service role key never in public code

3. **Backups:**
   - Enable automated daily backups
   - Test recovery process
   - Document recovery procedures

4. **Monitoring:**
   - Monitor Auth logs for failed logins
   - Check vote table size
   - Monitor storage usage
   - Set up alerts for errors

## Support

For Supabase-specific issues: https://supabase.com/docs
For project issues: Create GitHub issue or contact admin
