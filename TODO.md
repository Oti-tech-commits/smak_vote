# TODO - Student Voting System Production Readiness

## Step 1: Database concurrency + max vote enforcement
- [x] Add new migration `supabase/migrations/0003_fix_cast_ballot_concurrency.sql`
  - [x] Replace `cast_ballot` to enforce `positions.max_votes` per position
  - [x] Prevent double voting under concurrency by using plain INSERT into `voter_status` (no `on conflict do update`)
  - [ ] Keep everything transactionally safe


## Step 2: Secure reports endpoints
- [ ] Update `app/api/reports/excel/route.ts`
  - [ ] Require Bearer token
  - [ ] Check role is `admin` or `officer`
- [ ] Update `app/api/reports/pdf/route.ts`
  - [ ] Same auth+role enforcement

## Step 3: Add authenticated stats endpoints
- [ ] Create `app/api/admin/stats/route.ts` (admin-only)
- [ ] Create `app/api/officer/stats/route.ts` (admin/officer)

## Step 4: Candidate photo validation
- [ ] Update `app/api/admin/candidates/route.ts`
  - [ ] Restrict MIME types to png/jpeg/webp/gif
  - [ ] Limit size to 2MB

## Step 5: Prevent orphaned auth accounts on register
- [ ] Update `app/api/auth/register/route.ts`
  - [ ] Check `profiles` for existing `student_number` or `email` before `auth.admin.createUser`

## Step 6: Convert dashboards to client components with role checks
- [ ] Update `app/admin/page.tsx` to client component
  - [ ] Use `supabaseClient.auth.getSession()`
  - [ ] Verify role client-side
  - [ ] Fetch stats from `/api/admin/stats`
- [ ] Update `app/officer/page.tsx` to client component
  - [ ] Verify role client-side
  - [ ] Fetch stats from `/api/officer/stats`

## Step 7: Multi-vote UI for positions with max_votes > 1
- [ ] Refactor `app/vote/page.tsx`
  - [ ] Allow multiple candidate selections per position up to `position.max_votes`
  - [ ] Toggle selected candidates
  - [ ] Highlight all selections
  - [ ] Submit all selections

## Step 8: Tests / TypeScript fixes
- [ ] Update `lib/auth.test.ts` to fix mocked `supabaseServer.auth.getUser` typing

## Step 9: Verification
- [ ] `npm run test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Manual checks: dashboards/report auth, multi-vote, concurrent vote behavior

