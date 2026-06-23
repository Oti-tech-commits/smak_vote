# Go Live Checklist — St. Mark's Voting System

This is your step-by-step guide to put the app online **for free** using Supabase + Cloudflare + GitHub.

Your project is already on GitHub: **https://github.com/AminBen16/smak-vote**  
Your Supabase project is already created and linked: **smak-vote** (`rboxpxmjvheusyssdjan`)

---

## What you need (5 things)

| # | What | Where to get it |
|---|------|-----------------|
| 1 | Supabase URL + keys | Supabase Dashboard |
| 2 | Cloudflare Account ID | Cloudflare Dashboard |
| 3 | Cloudflare API Token | Cloudflare Dashboard |
| 4 | GitHub repo secrets | GitHub repo settings |
| 5 | Admin password | You choose this |

---

## Step 1 — Supabase (database & login)

1. Open **https://supabase.com/dashboard** and sign in.
2. Click your project **smak-vote**.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
4. Go to **Storage → Buckets → New bucket**:
   - Name: `candidate-photos`
   - Public: **No** (private)
5. Apply database tables (run once on your PC in the project folder):

```powershell
cd C:\Users\SMAK12\Desktop\smak_vote
supabase db push
```

6. Create your admin account in **Authentication → Users → Add user** (pick email + strong password).
7. Seed the admin profile (replace with your email/password):

```powershell
$env:SEED_ADMIN_EMAIL="admin@stmark.com"
$env:SEED_ADMIN_PASSWORD="YourStrongPassword123"
$env:SEED_ADMIN_STUDENT_NUMBER="ADMIN001"
npm run supabase:seed
```

---

## Step 2 — Cloudflare (hosting)

1. Open **https://dash.cloudflare.com** and sign in (free account is fine).
2. Copy your **Account ID** from the right sidebar on the Workers & Pages overview page.
3. Create an API token:
   - **My Profile → API Tokens → Create Token**
   - Use template **Edit Cloudflare Workers**
   - Create and copy the token (shown once).
4. After first deploy, set **Worker environment variables** in Cloudflare:
   - **Workers & Pages → smak-vote → Settings → Variables**
   - Add the same Supabase variables listed in Step 3 below.

Your live URL will look like: **https://smak-vote.YOUR_SUBDOMAIN.workers.dev**

---

## Step 3 — GitHub secrets (auto-deploy on push)

1. Open **https://github.com/AminBen16/smak-vote/settings/secrets/actions**
2. Click **New repository secret** for each:

| Secret name | Value |
|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase API settings |
| `SUPABASE_URL` | Same as NEXT_PUBLIC_SUPABASE_URL |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase API settings |
| `CLOUDFLARE_API_TOKEN` | From Step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | From Step 2 |

---

## Step 4 — Deploy

After secrets are saved, push the latest code:

```powershell
cd C:\Users\SMAK12\Desktop\smak_vote
git add .
git commit -m "fix: wire Cloudflare Workers deploy and CI"
git push origin main
```

Watch progress at: **https://github.com/AminBen16/smak-vote/actions**

When the **Deploy to Cloudflare** workflow is green, your site is live.

---

## Step 5 — Test the live site

1. Open your Cloudflare Workers URL.
2. Log in as admin (email/password from Step 1).
3. Create a test election, add a position and candidate.
4. Register a test student and submit a vote.
5. Check results on the Results page.

---

## Optional — Custom domain (e.g. voting.stmark.edu.ng)

1. In Cloudflare: **Workers & Pages → smak-vote → Settings → Domains & Routes → Add**
2. Enter your domain and follow DNS instructions.
3. SSL is automatic on Cloudflare.

---

## Local testing (before going live)

Copy `.env.example` to `.env.local`, fill in your Supabase keys, then:

```powershell
npm install
npm run dev
```

Open **http://localhost:3000**

---

## If something fails

| Problem | Fix |
|---------|-----|
| GitHub Action fails on `npm ci` | Run `npm install` locally, commit `package-lock.json`, push again |
| Deploy fails — missing Cloudflare token | Re-check secrets in GitHub |
| Login fails on live site | Confirm Supabase env vars are set in Cloudflare Worker settings |
| Admin can't access panel | Re-run `npm run supabase:seed` with correct admin email |
| Candidate photo upload fails | Confirm `candidate-photos` bucket exists in Supabase |

---

## Need help?

Reply in Cursor with:
- Which step you're on
- A screenshot or copy of the error message

I'll walk you through the exact click or command to fix it.
