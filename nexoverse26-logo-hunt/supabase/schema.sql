-- NEXOVERSE'26 LOGO HUNT database
create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'waiting' check (status in ('waiting','running','paused','ended')),
  active_round_id uuid,
  active_question_id uuid,
  question_visible boolean not null default false,
  logo_visible boolean not null default false,
  buzzer_open boolean not null default false,
  paused boolean not null default false,
  timer_started_at timestamptz,
  timer_seconds integer not null default 30,
  buzzer_attempt integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  question_text text not null,
  correct_answer text not null,
  logo_url text,
  points integer not null default 10,
  timer_seconds integer not null default 30,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  department text not null,
  status text not null default 'joined',
  score integer not null default 0,
  buzz_wins integer not null default 0,
  joined_at timestamptz not null default now()
);

create table if not exists buzzes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  attempt_number integer not null,
  priority integer not null,
  created_at timestamptz not null default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  attempt_number integer not null,
  answer_text text not null,
  result text not null default 'pending' check (result in ('pending','correct','wrong')),
  submitted_at timestamptz not null default now()
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists one_participant_buzz_per_question
  on buzzes(question_id, participant_id);

create unique index if not exists one_priority_one_per_attempt
  on buzzes(question_id, attempt_number, priority);

alter table events add constraint events_active_round_fk
  foreign key (active_round_id) references rounds(id) on delete set null;
alter table events add constraint events_active_question_fk
  foreign key (active_question_id) references questions(id) on delete set null;

-- Atomic server-side first buzzer.
create or replace function record_buzz(p_event_id uuid, p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e events%rowtype;
  qid uuid;
  next_priority integer;
  b_id uuid;
begin
  select * into e from events where id = p_event_id for update;

  if not found then
    return jsonb_build_object('accepted',false,'reason','event_not_found');
  end if;

  qid := e.active_question_id;

  if e.status <> 'running' or e.paused or not e.buzzer_open or qid is null then
    return jsonb_build_object('accepted',false,'reason','buzzer_closed');
  end if;

  if not exists(select 1 from participants where id=p_participant_id and event_id=p_event_id) then
    return jsonb_build_object('accepted',false,'reason','participant_not_found');
  end if;

  if exists(select 1 from buzzes where question_id=qid and participant_id=p_participant_id) then
    return jsonb_build_object('accepted',false,'reason','already_buzzed');
  end if;

  select coalesce(max(priority),0)+1 into next_priority
  from buzzes
  where question_id=qid and attempt_number=e.buzzer_attempt;

  insert into buzzes(event_id,question_id,participant_id,attempt_number,priority)
  values(p_event_id,qid,p_participant_id,e.buzzer_attempt,next_priority)
  returning id into b_id;

  return jsonb_build_object(
    'accepted',true,
    'buzz_id',b_id,
    'priority',next_priority,
    'winner',next_priority=1
  );
end;
$$;

-- Demo event only. Remove/change if you want a different code.
insert into events(code,status)
values('NEXO26','waiting')
on conflict(code) do nothing;

-- Create first round automatically for the demo event.
insert into rounds(event_id,name,sort_order)
select e.id,'Round 1',1 from events e
where e.code='NEXO26'
and not exists(select 1 from rounds r where r.event_id=e.id);

-- Storage bucket. If your Supabase UI does not allow this statement,
-- create a PUBLIC bucket named question-images manually.
insert into storage.buckets(id,name,public)
values('question-images','question-images',true)
on conflict(id) do nothing;
