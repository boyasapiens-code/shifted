-- SHIFTED — in-app messaging.
-- One conversation per employer↔worker pair, openable only once a real
-- relationship exists (an application to the employer's job, or an engagement).
-- Run after 0001–0009.

-- May this employer and worker message each other?
create or replace function can_message(p_employer uuid, p_worker uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from applications a
    join jobs j on j.id = a.job_id
    where j.employer_id = p_employer and a.candidate_id = p_worker
  ) or exists (
    select 1 from engagements e
    where e.employer_id = p_employer and e.worker_id = p_worker
  );
$$;

create table conversations (
  id                    uuid primary key default gen_random_uuid(),
  employer_id           uuid not null references employer_profiles (id) on delete cascade,
  worker_id             uuid not null references candidate_profiles (id) on delete cascade,
  job_id                uuid references jobs (id) on delete set null,
  last_message_at       timestamptz not null default now(),
  employer_last_read_at timestamptz,
  worker_last_read_at   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (employer_id, worker_id)
);

create trigger conversations_set_updated_at
  before update on conversations
  for each row execute function set_updated_at();

create index conversations_employer_idx on conversations (employer_id);
create index conversations_worker_idx   on conversations (worker_id);
create index conversations_activity_idx on conversations (last_message_at desc);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id       uuid not null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

-- Bump the conversation's activity when a message lands.
create or replace function trg_bump_conversation()
returns trigger language plpgsql as $$
begin
  update conversations set last_message_at = new.created_at, updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on messages
  for each row execute function trg_bump_conversation();

-- Is the current user a participant in this conversation?
create or replace function is_conversation_member(conv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = conv and (c.employer_id = auth.uid() or c.worker_id = auth.uid())
  );
$$;

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table conversations enable row level security;
alter table messages      enable row level security;

create policy "conversations: member read"
  on conversations for select
  using (auth.uid() = employer_id or auth.uid() = worker_id);

create policy "conversations: member create with relationship"
  on conversations for insert to authenticated
  with check (
    (auth.uid() = employer_id or auth.uid() = worker_id)
    and can_message(employer_id, worker_id)
  );

create policy "conversations: member update"
  on conversations for update
  using (auth.uid() = employer_id or auth.uid() = worker_id);

create policy "messages: member read"
  on messages for select using (is_conversation_member(conversation_id));

create policy "messages: member send"
  on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_conversation_member(conversation_id));

grant all on conversations to anon, authenticated, service_role;
grant all on messages      to anon, authenticated, service_role;
