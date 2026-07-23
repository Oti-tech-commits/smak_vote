-- Migration 0006: Fix Anonymity Breach in Audit Logs
-- The previous cast_ballot logged the exact votes cast linked to the student_id.
-- This update ensures that we only log participation, not the ballot content.

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
  position_vote_counts jsonb := '{}'::jsonb;
  submitted_count int;
  v_max_votes int;
begin
  -- 1. Verify election is open
  select status into election_status from elections where id = p_election_id;
  if election_status is null then
    raise exception 'Election not found';
  end if;
  if election_status <> 'open' then
    raise exception 'Election is not open';
  end if;

  -- 2. Validate payload type
  if p_votes is null or jsonb_typeof(p_votes) <> 'array' then
    raise exception 'Invalid votes payload';
  end if;

  -- 3. Pre-validate candidates and counts per position
  submitted_count := 0;
  for vote_record in select * from jsonb_array_elements(p_votes)
  loop
    v_candidate_id := (vote_record ->> 'candidate_id')::uuid;
    v_position_id := (vote_record ->> 'position_id')::uuid;

    if not exists(
      select 1 from candidates
      where id = v_candidate_id and position_id = v_position_id
    ) then
      raise exception 'Invalid candidate selection';
    end if;

    position_vote_counts := jsonb_set(
      position_vote_counts,
      ARRAY[v_position_id::text],
      to_jsonb(COALESCE((position_vote_counts ->> v_position_id::text)::int, 0) + 1),
      true
    );
    submitted_count := submitted_count + 1;
    if submitted_count > 500 then
      raise exception 'Too many votes submitted';
    end if;
  end loop;

  if submitted_count = 0 then
    raise exception 'No valid votes submitted';
  end if;

  -- 4. Enforce max_votes per position
  for v_position_id in select key::uuid from jsonb_each_text(position_vote_counts)
  loop
    select max_votes into v_max_votes from positions where id = v_position_id and election_id = p_election_id;
    if v_max_votes is null then raise exception 'Invalid position selection'; end if;
    if (position_vote_counts ->> v_position_id::text)::int > v_max_votes then
      raise exception 'Max votes exceeded for position %', v_position_id;
    end if;
  end loop;

  -- 5. Prevent double voting (Atomic participation check)
  insert into voter_status(student_id, election_id, has_voted, voted_at)
    values (p_student_id, p_election_id, true, now());

  -- 6. Insert anonymous votes
  for vote_record in select * from jsonb_array_elements(p_votes)
  loop
    v_candidate_id := (vote_record ->> 'candidate_id')::uuid;
    v_position_id := (vote_record ->> 'position_id')::uuid;
    insert into votes(election_id, position_id, candidate_id)
      values (p_election_id, v_position_id, v_candidate_id);
  end loop;

  -- 7. Consume voting token if applicable
  if p_voting_token is not null then
    update voting_tokens
      set used = true, used_by = p_student_id
    where token = p_voting_token and election_id = p_election_id and used = false and expires_at > now();
    if not found then raise exception 'Invalid or expired voting token'; end if;
  end if;

  -- 8. Log participation WITHOUT the ballot content to maintain anonymity
  insert into audit_logs(user_id, action, details)
    values (
      p_student_id,
      'vote_participation',
      jsonb_build_object('election_id', p_election_id) -- Only log participation, NOT the votes
    );
end;
$$;
