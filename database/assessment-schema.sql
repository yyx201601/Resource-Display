-- Reusable assessment storage for PostgreSQL 15+.
-- Run this for a new database. Existing installations should run
-- assessment-manual-marking-migration.sql instead.

begin;

create extension if not exists pgcrypto;

create table if not exists assessment_definitions (
  id bigint generated always as identity primary key,
  slug text not null,
  version text not null,
  title text not null,
  scorer_key text not null,
  max_score smallint not null check (max_score > 0),
  manual_max_score smallint not null default 0 check (
    manual_max_score between 0 and max_score
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_definitions_slug_version_unique unique (slug, version),
  constraint assessment_definitions_scorer_key_unique unique (scorer_key),
  constraint assessment_definitions_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$')
);

create table if not exists assessment_sessions (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid(),
  assessment_id bigint not null references assessment_definitions(id) on delete restrict,
  class_code text not null,
  class_name text not null,
  access_code_hash text not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_sessions_public_id_unique unique (public_id),
  constraint assessment_sessions_class_code_format check (
    class_code ~ '^[a-z0-9][a-z0-9-]{0,79}$'
  ),
  constraint assessment_sessions_valid_window check (
    closes_at is null or closes_at > opens_at
  )
);

create table if not exists assessment_attempts (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid(),
  session_id bigint not null references assessment_sessions(id) on delete restrict,
  client_attempt_id uuid not null,
  student_name text not null check (
    char_length(btrim(student_name)) between 1 and 80
  ),
  status text not null default 'started' check (status in ('started', 'submitted')),
  grading_status text not null default 'not_required' check (
    grading_status in ('not_required', 'pending', 'graded')
  ),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  automatic_score smallint,
  manual_score smallint,
  score smallint,
  max_score smallint not null check (max_score > 0),
  manual_max_score smallint not null default 0 check (
    manual_max_score between 0 and max_score
  ),
  score_breakdown jsonb not null default '{}'::jsonb check (
    jsonb_typeof(score_breakdown) = 'object'
  ),
  teacher_feedback text not null default '',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  marked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint assessment_attempts_public_id_unique unique (public_id),
  constraint assessment_attempts_session_client_unique unique (
    session_id,
    client_attempt_id
  ),
  constraint assessment_attempts_automatic_score_range check (
    automatic_score is null
    or automatic_score between 0 and (max_score - manual_max_score)
  ),
  constraint assessment_attempts_manual_score_range check (
    manual_score is null or manual_score between 0 and manual_max_score
  ),
  constraint assessment_attempts_score_range check (
    score is null or score between 0 and max_score
  ),
  constraint assessment_attempts_submission_state check (
    (
      status = 'started'
      and submitted_at is null
      and automatic_score is null
      and manual_score is null
      and score is null
      and grading_status = 'not_required'
      and marked_at is null
    )
    or
    (
      status = 'submitted'
      and submitted_at is not null
      and automatic_score is not null
      and (
        (
          manual_max_score = 0
          and grading_status = 'not_required'
          and manual_score is null
          and score = automatic_score
          and marked_at is null
        )
        or
        (
          manual_max_score > 0
          and grading_status = 'pending'
          and manual_score is null
          and score is null
          and marked_at is null
        )
        or
        (
          manual_max_score > 0
          and grading_status = 'graded'
          and manual_score is not null
          and score = automatic_score + manual_score
          and marked_at is not null
        )
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
    attempt_id,
    question_key
  ),
  constraint assessment_manual_marks_score_range check (
    score between 0 and max_score
  )
);

create unique index if not exists assessment_sessions_one_active_class_idx
  on assessment_sessions (assessment_id, class_code)
  where status = 'active';
create index if not exists assessment_sessions_assessment_id_idx
  on assessment_sessions (assessment_id);
create index if not exists assessment_attempts_session_submitted_idx
  on assessment_attempts (session_id, submitted_at desc nulls last);
create index if not exists assessment_attempts_pending_marking_idx
  on assessment_attempts (grading_status, submitted_at)
  where status = 'submitted' and manual_max_score > 0;
create index if not exists assessment_manual_marks_attempt_id_idx
  on assessment_manual_marks (attempt_id);

create or replace function set_assessment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assessment_definitions_set_updated_at on assessment_definitions;
create trigger assessment_definitions_set_updated_at
before update on assessment_definitions
for each row execute function set_assessment_updated_at();

drop trigger if exists assessment_sessions_set_updated_at on assessment_sessions;
create trigger assessment_sessions_set_updated_at
before update on assessment_sessions
for each row execute function set_assessment_updated_at();

drop trigger if exists assessment_manual_marks_set_updated_at on assessment_manual_marks;
create trigger assessment_manual_marks_set_updated_at
before update on assessment_manual_marks
for each row execute function set_assessment_updated_at();

alter table assessment_definitions enable row level security;
alter table assessment_sessions enable row level security;
alter table assessment_attempts enable row level security;
alter table assessment_manual_marks enable row level security;

revoke all on assessment_definitions from public;
revoke all on assessment_sessions from public;
revoke all on assessment_attempts from public;
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

insert into assessment_sessions (
  assessment_id, class_code, class_name, access_code_hash
)
select
  assessment_definitions.id,
  'year8-default',
  'Year 8 Digital Technologies',
  crypt('START', gen_salt('bf'))
from assessment_definitions
where assessment_definitions.slug = 'year8-dt-45'
  and assessment_definitions.version = 'v2'
  and not exists (
    select 1
    from assessment_sessions
    where assessment_sessions.assessment_id = assessment_definitions.id
      and assessment_sessions.class_code = 'year8-default'
      and assessment_sessions.status = 'active'
  );

commit;

-- Change the active Year 8 access code:
-- update assessment_sessions
-- set access_code_hash = crypt('NEW-CODE', gen_salt('bf'))
-- where class_code = 'year8-default' and status = 'active';
