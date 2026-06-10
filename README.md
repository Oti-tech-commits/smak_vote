# St. Mark’s Prefect Voting Management System

A secure, production-ready voting platform for St. Mark’s Secondary School prefect elections.

## Features

- Role-based access for Admin, Election Officer, and Student
- Supabase Auth with email/password and voting token support
- Secure voting engine with anonymous vote storage and audit logging
- Real-time results and turnout reporting
- Report export in PDF and Excel
- PWA-ready with offline caching
- Tailwind CSS and TypeScript frontend
- Supabase migrations, row-level security, and storage policies

## Setup

1. Copy `.env.example` to `.env.local`
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
3. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` for the initial admin
4. Run:
   - `npm install`
   - `npm run supabase:migrate`
   - `npm run supabase:seed`
   - `npm run dev`

## Deployment

- Build: `npm run build`
- Start: `npm run start`
- Cloudflare Pages: configure environment variables and point to this repository

## Testing

- Unit tests: `npm run test`
- Playwright: `npm run playwright:test`

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_STUDENT_NUMBER`

## Supabase Storage

Create a Supabase Storage bucket named `candidate-photos` and apply secure storage policies for public read access and authenticated uploads.
