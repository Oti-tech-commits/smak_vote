# TODO - smak-vote fixes

## Phase A (Vote page correctness + UX)
- [x] Implement per-position multi-vote counter + toggle selection without replacement
- [ ] Dim/disable candidate buttons when per-position max reached
- [ ] Add submit success state: disable submit, show confirmation card, hide grid

## Phase B (Auth/register robustness + elections/profile)
- [ ] Rollback dangling auth user if profiles upsert fails in app/api/auth/register/route.ts
- [ ] elections: switch to .maybeSingle() and handle null election
- [ ] lib/auth.ts: switch profiles lookup to .maybeSingle()

## Phase C (Results + officer + CSP + admin panel)
- [ ] results API: aggregate vote counts by position/candidate + turnout
- [ ] results page: render tallies/winners/turnout
- [ ] officer: replace realtime turnout placeholder with real data
- [ ] middleware: tighten CSP connect-src to NEXT_PUBLIC_SUPABASE_URL origin
- [ ] admin-panel: split message state per section

## Phase D (Admin election status + vote route hardening)
- [ ] admin stats route: include election title and update UI to render title
- [ ] (optional hardening) vote route: map unique-violation from cast_ballot to friendly 403

