-- Telegram bot support for the existing Montaji Supabase database.
-- Run in Supabase SQL Editor after the existing supabase/schema.sql.

create table if not exists public.telegram_users (
  telegram_id bigint primary key,
  username text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Монтажи',
  timezone text not null default 'Europe/Kaliningrad',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_members (
  workspace_id uuid not null references public.telegram_workspaces(id) on delete cascade,
  telegram_id bigint not null references public.telegram_users(telegram_id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  invite_code text unique,
  created_at timestamptz not null default now(),
  primary key (workspace_id, telegram_id)
);

create table if not exists public.telegram_sessions (
  telegram_id bigint primary key references public.telegram_users(telegram_id) on delete cascade,
  workspace_id uuid not null references public.telegram_workspaces(id) on delete cascade,
  state text not null default 'idle',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists telegram_members_user_idx on public.telegram_members(telegram_id);
create index if not exists telegram_members_invite_idx on public.telegram_members(invite_code);

-- Reminder delivery deduplication. One row per reminder type and job.
create table if not exists public.telegram_reminders (
  job_id uuid not null references public.jobs(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('morning','one_hour','evening')),
  reminder_date date not null,
  sent_at timestamptz not null default now(),
  primary key (job_id, reminder_type, reminder_date)
);

-- Optional workspace_id on jobs is deliberately avoided: the existing database is a single private Montaji workspace.
-- Access is controlled by Telegram membership in the Worker using the service role key.

create or replace function public.set_telegram_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_telegram_users_updated_at on public.telegram_users;
create trigger trg_telegram_users_updated_at
before update on public.telegram_users
for each row execute procedure public.set_telegram_updated_at();

drop trigger if exists trg_telegram_sessions_updated_at on public.telegram_sessions;
create trigger trg_telegram_sessions_updated_at
before update on public.telegram_sessions
for each row execute procedure public.set_telegram_updated_at();

alter table public.telegram_users enable row level security;
alter table public.telegram_workspaces enable row level security;
alter table public.telegram_members enable row level security;
alter table public.telegram_sessions enable row level security;
alter table public.telegram_reminders enable row level security;

-- The bot uses the Supabase service-role key server-side. No public client policy is needed.
