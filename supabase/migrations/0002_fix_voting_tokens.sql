-- Migration 0002: Fix voting_tokens schema
-- Make expires_at nullable and allow unassigned tokens

alter table voting_tokens 
alter column expires_at drop not null;

alter table voting_tokens
alter column student_id drop not null;

-- Add index for token lookups
create index if not exists idx_voting_tokens_token on voting_tokens(token);
create index if not exists idx_voting_tokens_election_used on voting_tokens(election_id, used);

-- Improve RLS policies
drop policy if exists voting_tokens_admin on voting_tokens;
create policy voting_tokens_admin_select on voting_tokens for select using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy voting_tokens_admin_write on voting_tokens for all using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
