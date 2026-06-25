create or replace function admin_stats_report()
returns table(
  total_students bigint,
  total_elections bigint,
  total_candidates bigint,
  total_votes bigint
) language sql as $$
  select
    (select count(*) from profiles where role = 'student') as total_students,
    (select count(*) from elections) as total_elections,
    (select count(*) from candidates) as total_candidates,
    (select count(*) from votes) as total_votes;
$$;
