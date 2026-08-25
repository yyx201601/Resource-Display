begin;

insert into assessment_definitions (
  slug,
  version,
  title,
  scorer_key,
  max_score,
  manual_max_score
)
values (
  'year8-dt-45',
  'v3',
  'Year 8 Digital Technologies Test',
  'year8-dt-45-v3',
  48,
  10
)
on conflict (slug, version)
do update set
  title = excluded.title,
  scorer_key = excluded.scorer_key,
  max_score = excluded.max_score,
  manual_max_score = excluded.manual_max_score;

insert into assessment_sessions (
  assessment_id,
  class_code,
  class_name,
  access_code_hash
)
select
  v3.id,
  previous_session.class_code,
  previous_session.class_name,
  previous_session.access_code_hash
from assessment_definitions v3
join lateral (
  select distinct on (assessment_sessions.class_code)
    assessment_sessions.class_code,
    assessment_sessions.class_name,
    assessment_sessions.access_code_hash
  from assessment_sessions
  join assessment_definitions previous_definition
    on previous_definition.id = assessment_sessions.assessment_id
  where previous_definition.slug = v3.slug
    and previous_definition.version <> v3.version
    and assessment_sessions.status = 'active'
  order by assessment_sessions.class_code, assessment_sessions.created_at desc
) previous_session on true
where v3.slug = 'year8-dt-45'
  and v3.version = 'v3'
  and not exists (
    select 1
    from assessment_sessions existing_session
    where existing_session.assessment_id = v3.id
      and existing_session.class_code = previous_session.class_code
      and existing_session.status = 'active'
  );

update assessment_sessions
set
  status = 'closed',
  closes_at = coalesce(closes_at, now()),
  updated_at = now()
where status = 'active'
  and assessment_id in (
    select id
    from assessment_definitions
    where slug = 'year8-dt-45'
      and version <> 'v3'
  );

commit;
