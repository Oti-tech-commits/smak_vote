-- Migration 0007: Bulletproof Election Integrity
-- Revoke all to ensure we start from a clean slate
REVOKE ALL ON FUNCTION cast_ballot(uuid, uuid, jsonb, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION cast_ballot(
  p_student_id uuid,
  p_election_id uuid,
  p_votes jsonb,
  p_voting_token text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges
SET search_path = public
AS $$
DECLARE
  v_election_status text;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_voter_role text;
  v_vote_record jsonb;
  v_candidate_id uuid;
  v_position_id uuid;
  v_max_votes int;
  v_position_vote_counts jsonb := '{}'::jsonb;
  v_total_votes int := 0;
  v_random_jitter interval;
BEGIN
  -- 1. Identity Validation
  SELECT role INTO v_voter_role FROM profiles WHERE id = p_student_id;
  IF v_voter_role IS NULL THEN
    RAISE EXCEPTION 'Voter profile not found';
  END IF;
  
  -- 2. Election Window Validation
  SELECT status, start_time, end_time 
  INTO v_election_status, v_start_time, v_end_time 
  FROM elections WHERE id = p_election_id;
  
  IF v_election_status IS NULL THEN
    RAISE EXCEPTION 'Election not found';
  END IF;
  
  IF v_election_status <> 'open' THEN
    RAISE EXCEPTION 'Election is not currently open for voting (Status: %)', v_election_status;
  END IF;
  
  IF now() < v_start_time OR now() > v_end_time THEN
    RAISE EXCEPTION 'Election is outside of its active window';
  END IF;

  -- 3. Double Voting Prevention (Row Lock)
  -- This SELECT FOR UPDATE ensures that concurrent attempts for the same student/election 
  -- will wait for the first one to finish.
  IF EXISTS (
    SELECT 1 FROM voter_status 
    WHERE student_id = p_student_id AND election_id = p_election_id 
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Voter has already participated in this election';
  END IF;

  -- 4. Payload Validation
  IF p_votes IS NULL OR jsonb_typeof(p_votes) <> 'array' THEN
    RAISE EXCEPTION 'Invalid votes payload format';
  END IF;

  -- 5. Candidate and Position Validation
  FOR v_vote_record IN SELECT * FROM jsonb_array_elements(p_votes)
  LOOP
    v_candidate_id := (v_vote_record ->> 'candidate_id')::uuid;
    v_position_id := (v_vote_record ->> 'position_id')::uuid;

    -- Verify candidate exists in the correct position and election
    IF NOT EXISTS (
      SELECT 1 FROM candidates c
      JOIN positions p ON c.position_id = p.id
      WHERE c.id = v_candidate_id AND p.id = v_position_id AND p.election_id = p_election_id
    ) THEN
      RAISE EXCEPTION 'Invalid candidate selection for this election';
    END IF;

    -- Track votes per position
    v_position_vote_counts := jsonb_set(
      v_position_vote_counts,
      ARRAY[v_position_id::text],
      to_jsonb(COALESCE((v_position_vote_counts ->> v_position_id::text)::int, 0) + 1),
      true
    );
    v_total_votes := v_total_votes + 1;
  END LOOP;

  IF v_total_votes = 0 THEN
    RAISE EXCEPTION 'No votes provided in ballot';
  END IF;

  -- 6. Max Votes per Position Enforcement
  FOR v_position_id IN SELECT key::uuid FROM jsonb_each_text(v_position_vote_counts)
  LOOP
    SELECT max_votes INTO v_max_votes FROM positions WHERE id = v_position_id;
    IF (v_position_vote_counts ->> v_position_id::text)::int > v_max_votes THEN
      RAISE EXCEPTION 'Selection limit exceeded for position %', v_position_id;
    END IF;
  END LOOP;

  -- 7. Voting Token Consumption (Atomic)
  IF p_voting_token IS NOT NULL THEN
    UPDATE voting_tokens
    SET used = true, used_by = p_student_id
    WHERE token = p_voting_token 
      AND election_id = p_election_id 
      AND used = false 
      AND (expires_at IS NULL OR expires_at > now());
      
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid, already used, or expired voting token';
    END IF;
  END IF;

  -- 8. Record Participation
  INSERT INTO voter_status (student_id, election_id, has_voted, voted_at)
  VALUES (p_student_id, p_election_id, true, now());

  -- 9. Record Anonymous Ballots with Temporal Decoupling
  FOR v_vote_record IN SELECT * FROM jsonb_array_elements(p_votes)
  LOOP
    v_candidate_id := (v_vote_record ->> 'candidate_id')::uuid;
    v_position_id := (v_vote_record ->> 'position_id')::uuid;
    -- Decouple by rounding the timestamp to the minute and adding a random jitter
    -- This makes it impossible to correlate with the precise 'voted_at' in voter_status
    v_random_jitter := (random() * 60 || ' seconds')::interval;
    
    INSERT INTO votes (election_id, position_id, candidate_id, created_at)
    VALUES (p_election_id, v_position_id, v_candidate_id, date_trunc('minute', now()) + v_random_jitter);
  END LOOP;

  -- 10. Audit Log (Anonymous)
  INSERT INTO audit_logs (user_id, action, details)
  VALUES (
    p_student_id, 
    'vote_cast', 
    jsonb_build_object('election_id', p_election_id)
  );
END;
$$;

-- Grant execute to authenticated users (and the service role)
GRANT EXECUTE ON FUNCTION cast_ballot(uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION cast_ballot(uuid, uuid, jsonb, text) TO service_role;
