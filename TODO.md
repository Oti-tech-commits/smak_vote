# TODO

## Part 1 — Bug fixes and wiring
- [x] 1) Fix loginSchema silent validation failure by preprocessing empty/whitespace strings to `undefined` in `lib/validators.ts`.
- [x] 2) Fix token-expiry bug in `app/api/auth/token/route.ts` so null/undefined `expires_at` means never expires.
- [x] 3) Add visible "Next" link/button to `/register` from officer "verify students" subtitle in `app/officer/page.tsx`.
- [x] 4) Add "Register Student" link/button to `/register` in `app/admin/page.tsx`.
- [x] 5) Resolve orphaned `/api/admin/students` route by confirming chosen approach and ensuring `app/register/page.tsx` points to it with role selector (student/officer). Add/keep code comment documenting the choice.
- [x] 6) Scope officer turnout to active/open election only in `app/api/officer/stats/route.ts`.
- [x] 7) Add appropriate `autoComplete` attributes to login inputs in `app/login/page.tsx`.



## Part 2 — Near-real-time dashboards
- [x] 8) Convert admin/officer stats fetch to polling every 10s (already added in UI; verify auth-expiry errors handled gracefully).


## Part 3 — Publish results to all users
- [x] 9) Allow unauthenticated viewing of published results only: update `app/api/results/route.ts` to not block on missing access when elections are published; update `app/results/page.tsx` to remove forced redirect to `/login` for unauthenticated users.


## Part 4 — Bulk student import UI for admin & officer
- [x] 10) Ensure API route `app/api/admin/students/import/route.ts` supports CSV/XLSX multipart upload, parses required columns, creates auth users + profiles as `student`, idempotently skips existing student_numbers, returns summary JSON, and writes `audit_logs`.
- [x] 11) Add "Bulk Import Students" card to `components/admin-panel.tsx` and upload control to `app/officer/page.tsx`. Ensure POST uses auth headers and re-runs stats fetch.
- [ ] 12) Update `DEPLOYMENT.md` or `README.md` documenting expected column headers and new in-UI bulk import.


## FINAL verification
- [ ] Run `npm run lint`, `npm test`, and `npm run build` and ensure all pass.

