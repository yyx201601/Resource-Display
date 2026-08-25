-- Reusable assessment storage for PostgreSQL 15+.
-- Run this once in the database connected to the Vercel project.

begin;

create extension if not exists pgcrypto;

create table if not exists assessment_definitions (
  id bigint generated always as identity primary key,
  slug text not null,
  version text not null,
  title text not null,
  scorer_key text not null,
  max_score smallint not null check (max_score > 0),
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
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  score smallint,
  max_score smallint not null check (max_score > 0),
  score_breakdown jsonb not null default '{}'::jsonb check (
    jsonb_typeof(score_breakdown) = 'object'
  ),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint assessment_attempts_public_id_unique unique (public_id),
  constraint assessment_attempts_session_client_unique unique (
    session_id,
    client_attempt_id
  ),
  constraint assessment_attempts_score_range check (
    score is null or score between 0 and max_score
  ),
  constraint assessment_attempts_submission_state check (
    (status = 'started' and score is null and submitted_at is null)
    or
    (status = 'submitted' and score is not null and submitted_at is not null)
  )
);

create unique index if not exists assessment_sessions_one_active_class_idx
  on assessment_sessions (assessment_id, class_code)
  where status = 'active';

create index if not exists assessment_sessions_assessment_id_idx
  on assessment_sessions (assessment_id);

create index if not exists assessment_attempts_session_submitted_idx
  on assessment_attempts (session_id, submitted_at desc nulls last);

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

alter table assessment_definitions enable row level security;
alter table assessment_sessions enable row level security;
alter table assessment_attempts enable row level security;

revoke all on assessment_definitions from public;
revoke all on assessment_sessions from public;
revoke all on assessment_attempts from public;

-- Register the current Year 8 test and create its first classroom session.
insert into assessment_definitions (
  slug,
  version,
  title,
  scorer_key,
  max_score
)
values (
  'year8-dt-45',
  'v1',
  'Year 8 Digital Technologies Test',
  'year8-dt-45-v1',
  45
)
on conflict (slug, version)
do update set
  title = excluded.title,
  scorer_key = excluded.scorer_key,
  max_score = excluded.max_score;

insert into assessment_sessions (
  assessment_id,
  class_code,
  class_name,
  access_code_hash
)
select
  assessment_definitions.id,
  'year8-default',
  'Year 8 Digital Technologies',
  crypt('START', gen_salt('bf'))
from assessment_definitions
where assessment_definitions.slug = 'year8-dt-45'
  and assessment_definitions.version = 'v1'
  and not exists (
    select 1
    from assessment_sessions
    where assessment_sessions.assessment_id = assessment_definitions.id
      and assessment_sessions.class_code = 'year8-default'
      and assessment_sessions.status = 'active'
  );

commit;

-- Change the access code for the active Year 8 session:
-- update assessment_sessions
-- set access_code_hash = crypt('NEW-CODE', gen_salt('bf'))
-- where class_code = 'year8-default' and status = 'active';

-- Create another class using the same assessment and scorer:
-- insert into assessment_sessions (assessment_id, class_code, class_name, access_code_hash)
-- select id, 'year8-class-b', 'Year 8 Class B', crypt('CLASS-B-CODE', gen_salt('bf'))
-- from assessment_definitions
-- where slug = 'year8-dt-45' and version = 'v1';
