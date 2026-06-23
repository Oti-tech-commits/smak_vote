-- Migration 0003: Production hardening for ballot casting concurrency and max vote enforcement
-- Goals:
-- 1) Enforce positions.max_votes per position inside cast_ballot
-- 2) Prevent double-voting race conditions by using plain INSERT into voter_status
--    (no on conflict do update) so concurrent votes fail with unique violation.

create extension if not exists pgcrypto;

create or replace function cast_ballot(
  p_student_id uuid,
  p_election_id uuid,
  p_votes jsonb,
  p_voting_token text default null
) returns void language plpgsql as $$
declare
  election_status text;
  vote_record jsonb;
  v_candidate_id uuid;
  v_position_id uuid;

  -- counts per position submitted in this ballot
  position_vote_counts jsonb := '{}'::jsonb;
  submitted_count int;

  -- max_votes per position
  v_max_votes int;

  -- used to ensure we only allow inserts when ballot is valid
  v_vote_pairs integer;
  token_updated boolean;
begin
  select status into election_status from elections where id = p_election_id;
  if election_status is null then
    raise exception 'Election not found';
  end if;
  if election_status <> 'open' then
    raise exception 'Election is not open';
  end if;

  -- Lock election rows to reduce window for race-y state changes.
  -- (Not strictly required for correctness but improves transactional safety.)
  perform 1 from elections where id = p_election_id for update;

  if p_votes is null or jsonb_typeof(p_votes) <> 'array' then
    raise exception 'Invalid votes payload';
  end if;

  -- Pre-validate candidates and build per-position counts
  position_vote_counts := '{}'::jsonb;
  submitted_count := 0;

  for vote_record in select * from jsonb_array_elements(p_votes)
  loop
    v_candidate_id := (vote_record ->> 'candidate_id')::uuid;
    v_position_id := (vote_record ->> 'position_id')::uuid;

    -- Candidate must exist and belong to the given position
    if not exists(
      select 1
      from candidates
      where id = v_candidate_id and position_id = v_position_id
    ) then
      raise exception 'Invalid candidate selection';
    end if;

    -- increment count for position
    position_vote_counts := jsonb_set(
      position_vote_counts,
      ARRAY[v_position_id::text],
      to_jsonb(COALESCE((position_vote_counts ->> v_position_id::text)::int, 0) + 1),
      true
    );

    submitted_count := submitted_count + 1;

    -- Optional: avoid huge payloads
    if submitted_count > 500 then
      raise exception 'Too many votes submitted';
    end if;
  end loop;

  if submitted_count = 0 then
    raise exception 'No valid votes submitted';
  end if;

  -- Enforce max_votes per position
  for v_position_id in
    select key::uuid from jsonb_each_text(position_vote_counts)
  loop
    select max_votes into v_max_votes
    from positions
    where id = v_position_id and election_id = p_election_id;

    if v_max_votes is null then
      raise exception 'Invalid position selection';
    end if;

    -- submitted count for this position
    submitted_count := (position_vote_counts ->> v_position_id::text)::int;
    if submitted_count > v_max_votes then
      raise exception 'Max votes exceeded for position %', v_position_id;
    end if;

    -- Insert votes for this position/candidate pairs
    -- Note: we insert only after all validations above.
  end loop;

  -- At this point, ballot is valid.
  -- Prevent double voting: plain INSERT into voter_status.
  -- If another concurrent transaction already inserted, UNIQUE(student_id,election_id)
  -- will raise an exception and the transaction will be rolled back.
  insert into voter_status(student_id, election_id, has_voted, voted_at)
    values (p_student_id, p_election_id, true, now());

  -- Insert votes
  for vote_record in select * from jsonb_array_elements(p_votes)
  loop
    v_candidate_id := (vote_record ->> 'candidate_id')::uuid;
    v_position_id := (vote_record ->> 'position_id')::uuid;

    insert into votes(election_id, position_id, candidate_id)
      values (p_election_id, v_position_id, v_candidate_id);
  end loop;

  -- Mark token as used (if provided)
  if p_voting_token is not null then
    update voting_tokens
      set used = true,
          used_by = p_student_id
    where token = p_voting_token
      and election_id = p_election_id
      and used = false
      and expires_at > now();

    if not found then
      raise exception 'Invalid or expired voting token';
    end if;
  end if;

  insert into audit_logs(user_id, action, details)
    values (
      p_student_id,
      'vote_submission',
      jsonb_build_object('election_id', p_election_id, 'votes', p_votes)
    );

end;
$$;

