-- Монтажи дверей: схема Supabase
-- Запускать целиком в SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_date date not null,
  slot smallint not null check (slot between 1 and 4),
  client_name text not null,
  phone text,
  address text,
  store_id uuid references public.stores(id) on delete set null,
  mount_price numeric(12,2) not null default 0,
  status text not null default 'Бронь' check (status in ('Бронь', 'Подтверждён', 'Выполнен', 'Перенос', 'Отменён')),
  payment_status text not null default 'Не оплачено' check (payment_status in ('Не оплачено', 'Частично', 'Оплачено')),
  comment text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists jobs_unique_active_slot
on public.jobs (job_date, slot)
where status <> 'Отменён';

create index if not exists jobs_date_idx on public.jobs(job_date);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_payment_idx on public.jobs(payment_status);
create index if not exists jobs_store_idx on public.jobs(store_id);

create table if not exists public.day_expenses (
  day_date date primary key,
  amount numeric(12,2) not null default 0,
  comment text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at
before update on public.stores
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
before update on public.jobs
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_day_expenses_updated_at on public.day_expenses;
create trigger trg_day_expenses_updated_at
before update on public.day_expenses
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.jobs enable row level security;
alter table public.day_expenses enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin_only"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- STORES
create policy "stores_select_authenticated"
on public.stores
for select
to authenticated
using (true);

create policy "stores_admin_insert"
on public.stores
for insert
to authenticated
with check (public.is_admin());

create policy "stores_admin_update"
on public.stores
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "stores_admin_delete"
on public.stores
for delete
to authenticated
using (public.is_admin());

-- JOBS
create policy "jobs_select_authenticated"
on public.jobs
for select
to authenticated
using (true);

create policy "jobs_admin_insert"
on public.jobs
for insert
to authenticated
with check (public.is_admin());

create policy "jobs_admin_update"
on public.jobs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "jobs_admin_delete"
on public.jobs
for delete
to authenticated
using (public.is_admin());

-- DAY EXPENSES
create policy "day_expenses_select_authenticated"
on public.day_expenses
for select
to authenticated
using (true);

create policy "day_expenses_admin_insert"
on public.day_expenses
for insert
to authenticated
with check (public.is_admin());

create policy "day_expenses_admin_update"
on public.day_expenses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "day_expenses_admin_delete"
on public.day_expenses
for delete
to authenticated
using (public.is_admin());
