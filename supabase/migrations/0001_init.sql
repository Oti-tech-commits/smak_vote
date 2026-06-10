-- Supabase migration for St. Mark's Prefect Voting Management System

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default auth.uid(),
  student_number text unique not null,
  email text unique not null,
  full_name text not null,
  class_name text not null,
  role text not null check (role in ('admin', 'officer', 'student')),
  created_at timestamptz not null default now()
);

create table if not exists elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('draft', 'open', 'closed', 'published')) default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  title text not null,
  max_votes int not null default 1
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  student_name text not null,
  class_name text not null,
  photo_url text not null,
  manifesto text not null
);

create table if not exists voter_status (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  election_id uuid not null references elections(id) on delete cascade,
  has_voted boolean not null default false,
  voted_at timestamptz,
  unique (student_id, election_id)
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  position_id uuid not null references positions(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists voting_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  election_id uuid not null references elections(id) on delete cascade,
  student_id uuid not null references profiles(id),
  expires_at timestamptz not null,
  used boolean not null default false,
  used_by uuid references profiles(id)
);

-- Stored procedures and helper functions
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
  validated_count int;
  vote_count int;
begin
  select status into election_status from elections where id = p_election_id;
  if election_status is null then
    raise exception 'Election not found';
  end if;
  if election_status <> 'open' then
    raise exception 'Election is not open';
  end if;

  select count(*) into vote_count from votes where election_id = p_election_id;

  if exists(select 1 from voter_status where student_id = p_student_id and election_id = p_election_id and has_voted) then
    raise exception 'Student has already voted in this election';
  end if;

  validated_count := 0;
  for vote_record in select * from jsonb_array_elements(p_votes) loop
    v_candidate_id := (vote_record ->> 'candidate_id')::uuid;
    v_position_id := (vote_record ->> 'position_id')::uuid;
    if not exists(select 1 from candidates where id = v_candidate_id and position_id = v_position_id) then
      raise exception 'Invalid candidate selection';
    end if;
    insert into votes(election_id, position_id, candidate_id) values (p_election_id, v_position_id, v_candidate_id);
    validated_count := validated_count + 1;
  end loop;

  if validated_count = 0 then
    raise exception 'No valid votes submitted';
  end if;

  insert into voter_status(student_id, election_id, has_voted, voted_at)
    values (p_student_id, p_election_id, true, now())
    on conflict (student_id, election_id) do update set has_voted = true, voted_at = now();

  if p_voting_token is not null then
    update voting_tokens
      set used = true, used_by = p_student_id
      where token = p_voting_token and election_id = p_election_id and used = false and expires_at > now();
    if not found then
      raise exception 'Invalid or expired voting token';
    end if;
  end if;

  insert into audit_logs(user_id, action, details)
    values (p_student_id, 'vote_submission', jsonb_build_object('election_id', p_election_id, 'votes', p_votes));
end;
$$;

create or replace function election_turnout_report() returns table(class_name text, registered_students int, votes_cast int, turnout_percentage numeric) language sql as $$
  select p.class_name,
         count(distinct p.id) as registered_students,
         count(v.id) as votes_cast,
         case when count(distinct p.id) = 0 then 0 else round((count(v.id)::numeric / count(distinct p.id)) * 100, 2) end
  from profiles p
  left join voter_status vs on vs.student_id = p.id
  left join votes v on v.election_id = vs.election_id and v.position_id in (select id from positions where election_id = vs.election_id)
  group by p.class_name;
$$;

-- Row level security
alter table profiles enable row level security;
create policy profiles_self on profiles for select using (auth.uid() = id or exists(select 1 from profiles p_admin where p_admin.id = auth.uid() and p_admin.role = 'admin'));
create policy profiles_self_update on profiles for update using (auth.uid() = id or exists(select 1 from profiles p_admin where p_admin.id = auth.uid() and p_admin.role = 'admin'));
create policy profiles_insert_admin on profiles for insert with check (exists(select 1 from profiles p_admin where p_admin.id = auth.uid() and p_admin.role = 'admin'));

alter table elections enable row level security;
create policy elections_public on elections for select using (true);
create policy elections_admin on elections for all using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table positions enable row level security;
create policy positions_public on positions for select using (true);
create policy positions_admin on positions for all using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table candidates enable row level security;
create policy candidates_public on candidates for select using (true);
create policy candidates_admin on candidates for all using (exists(select 1 from profiles p where p.id = auth.uid() and (p.role = 'admin' or p.role = 'officer')));

alter table voter_status enable row level security;
create policy voter_status_student on voter_status for select using (auth.uid() = student_id);
create policy voter_status_admin on voter_status for all using (exists(select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'officer')));

alter table votes enable row level security;
create policy votes_no_select on votes for select using (false);
create policy votes_insert_admin on votes for insert with check (exists(select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'officer')));

alter table audit_logs enable row level security;
create policy audit_logs_public on audit_logs for select using (exists(select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'officer')));
create policy audit_logs_admin on audit_logs for insert with check (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table voting_tokens enable row level security;
create policy voting_tokens_admin on voting_tokens for all using (exists(select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Election validation
create function validate_election_dates() returns trigger language plpgsql as $$
begin
  if new.end_time <= new.start_time then
    raise exception 'End time must be after start time';
  end if;
  return new;
end;
$$;

create trigger election_dates_trigger
  before insert or update on elections
  for each row execute function validate_election_dates();
