-- Upgrade an existing assessment database to support short-answer marking.
-- Existing v1 attempts remain unchanged. A v2 session reuses the previous
-- class details and access-code hash.

begin;

alter table assessment_definitions
  add column if not exists manual_max_score smallint not null default 0;

alter table assessment_attempts
  add column if not exists grading_status text not null default 'not_required',
  add column if not exists automatic_score smallint,
  add column if not exists manual_score smallint,
  add column if not exists manual_max_score smallint not null default 0,
  add column if not exists teacher_feedback text not null default '',
  add column if not exists marked_at timestamptz;

update assessment_attempts
set automatic_score = score
where status = 'submitted' and automatic_score is null;

alter table assessment_definitions
  drop constraint if exists assessment_definitions_manual_score_range;
alter table assessment_definitions
  add constraint assessment_definitions_manual_score_range check (
    manual_max_score between 0 and max_score
  );

alter table assessment_attempts
  drop constraint if exists assessment_attempts_submission_state,
  drop constraint if exists assessment_attempts_automatic_score_range,
  drop constraint if exists assessment_attempts_manual_score_range,
  drop constraint if exists assessment_attempts_grading_status_check,
  drop constraint if exists assessment_attempts_manual_max_score_check;

alter table assessment_attempts
  add constraint assessment_attempts_grading_status_check check (
    grading_status in ('not_required', 'pending', 'graded')
  ),
  add constraint assessment_attempts_manual_max_score_check check (
    manual_max_score between 0 and max_score
  ),
  add constraint assessment_attempts_automatic_score_range check (
    automatic_score is null
    or automatic_score between 0 and (max_score - manual_max_score)
  ),
  add constraint assessment_attempts_manual_score_range check (
    manual_score is null or manual_score between 0 and manual_max_score
  ),
  add constraint assessment_attempts_submission_state check (
    (
      status = 'started' and submitted_at is null
      and automatic_score is null and manual_score is null and score is null
      and grading_status = 'not_required' and marked_at is null
    )
    or
    (
      status = 'submitted' and submitted_at is not null
      and automatic_score is not null
      and (
        (
          manual_max_score = 0 and grading_status = 'not_required'
          and manual_score is null and score = automatic_score and marked_at is null
        )
        or
        (
          manual_max_score > 0 and grading_status = 'pending'
          and manual_score is null and score is null and marked_at is null
        )
        or
        (
          manual_max_score > 0 and grading_status = 'graded'
          and manual_score is not null and score = automatic_score + manual_score
          and marked_at is not null
        )
      )
    )
  );

create table if not exists assessment_manual_marks (
  id bigint generated always as identity primary key,
  attempt_id bigint not null references assessment_attempts(id) on delete cascade,
  question_key text not null check (
    question_key ~ '^[a-z0-9][a-z0-9-]{0,79}$'
  ),
  score smallint not null,
  max_score smallint not null check (max_score > 0),
  feedback text not null default '' check (char_length(feedback) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_manual_marks_attempt_question_unique unique (
    attempt_id, question_key
  ),
  constraint assessment_manual_marks_score_range check (score between 0 and max_score)
);

create index if not exists assessment_attempts_pending_marking_idx
  on assessment_attempts (grading_status, submitted_at)
  where status = 'submitted' and manual_max_score > 0;
create index if not exists assessment_manual_marks_attempt_id_idx
  on assessment_manual_marks (attempt_id);

drop trigger if exists assessment_manual_marks_set_updated_at on assessment_manual_marks;
create trigger assessment_manual_marks_set_updated_at
before update on assessment_manual_marks
for each row execute function set_assessment_updated_at();

alter table assessment_manual_marks enable row level security;
revoke all on assessment_manual_marks from public;
revoke all on assessment_definitions from anon, authenticated;
revoke all on assessment_sessions from anon, authenticated;
revoke all on assessment_attempts from anon, authenticated;
revoke all on assessment_manual_marks from anon, authenticated;

insert into assessment_definitions (
  slug, version, title, scorer_key, max_score, manual_max_score
)
values (
  'year8-dt-45', 'v2', 'Year 8 Digital Technologies Test',
  'year8-dt-45-v2', 45, 5
)
on conflict (slug, version)
do update set
  title = excluded.title,
  scorer_key = excluded.scorer_key,
  max_score = excluded.max_score,
  manual_max_score = excluded.manual_max_score;

update assessment_sessions
set status = 'closed', closes_at = coalesce(closes_at, now()), updated_at = now()
where status = 'active'
  and assessment_id in (
    select id from assessment_definitions
    where slug = 'year8-dt-45' and version <> 'v2'
  );

insert into assessment_sessions (
  assessment_id, class_code, class_name, access_code_hash
)
select
  v2.id,
  previous_session.class_code,
  previous_session.class_name,
  previous_session.access_code_hash
from assessment_definitions v2
join lateral (
  select
    assessment_sessions.class_code,
    assessment_sessions.class_name,
    assessment_sessions.access_code_hash
  from assessment_sessions
  join assessment_definitions previous_definition
    on previous_definition.id = assessment_sessions.assessment_id
  where previous_definition.slug = v2.slug
    and previous_definition.version <> v2.version
  order by assessment_sessions.created_at desc
  limit 1
) previous_session on true
where v2.slug = 'year8-dt-45' and v2.version = 'v2'
  and not exists (
    select 1 from assessment_sessions existing_session
    where existing_session.assessment_id = v2.id
      and existing_session.class_code = previous_session.class_code
      and existing_session.status = 'active'
  );

commit;
