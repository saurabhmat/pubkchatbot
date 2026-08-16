-- Reference copy of the Supabase schema this app queries against.
-- This is documentation only — the real schema already exists in Saurabh's
-- Supabase project (created there directly, not run from this repo).
-- The WordPress plugin (pubk-chatbot) writes rows here via a service-role key;
-- this app only ever reads, as an authenticated user, through the anon key + RLS below.

create table if not exists public.chat_logs (
  id bigint primary key,
  convo varchar(40) not null default '',
  question text,
  answer text,
  topic varchar(32) not null default '',
  outcome varchar(20) not null default '',
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  member smallint not null default 0,
  created_at timestamptz not null
);
create index if not exists chat_logs_convo_idx on public.chat_logs(convo);
create index if not exists chat_logs_created_at_idx on public.chat_logs(created_at);
create index if not exists chat_logs_topic_idx on public.chat_logs(topic);
create index if not exists chat_logs_outcome_idx on public.chat_logs(outcome);

create table if not exists public.chat_events (
  id bigint primary key,
  convo varchar(40) not null default '',
  event_type varchar(20) not null default '',
  reason varchar(32) not null default '',
  tag varchar(64) not null default '',
  routed_to varchar(80) not null default '',
  name varchar(160) not null default '',
  email varchar(160) not null default '',
  member smallint not null default 0,
  ghl_ok smallint not null default 0,
  ghl_msg text,
  test_mode smallint not null default 0,
  created_at timestamptz not null
);
create index if not exists chat_events_convo_idx on public.chat_events(convo);
create index if not exists chat_events_created_at_idx on public.chat_events(created_at);

create or replace view public.conversation_summary
with (security_invoker = true) as
select
  convo,
  max(id) as last_id,
  min(created_at) as started,
  max(created_at) as ended,
  count(*) as exchanges,
  max(member) as member,
  sum((outcome = 'fallback')::int) as fallbacks,
  sum((outcome = 'handover_offered')::int) as handovers,
  sum((outcome = 'lead_offered')::int) as leads,
  (array_agg(question order by id asc))[1] as first_question,
  array_agg(distinct topic) filter (where topic <> '') as topics
from public.chat_logs
group by convo;

alter table public.chat_logs enable row level security;
alter table public.chat_events enable row level security;
revoke all on public.chat_logs from anon, authenticated;
revoke all on public.chat_events from anon, authenticated;
revoke all on public.conversation_summary from anon, authenticated;
grant select on public.chat_logs to authenticated;
grant select on public.chat_events to authenticated;
grant select on public.conversation_summary to authenticated;
create policy "authenticated_read_chat_logs" on public.chat_logs for select to authenticated using (true);
create policy "authenticated_read_chat_events" on public.chat_events for select to authenticated using (true);
