
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  role text not null default 'patient' check (role in ('patient', 'doctor', 'caregiver')),
  phone text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists avatar_url text not null default '';

update public.profiles
set email = auth.users.email
from auth.users
where public.profiles.id = auth.users.id
and coalesce(public.profiles.email, '') = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'patient')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.care_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewer_role text not null check (viewer_role in ('doctor', 'caregiver')),
  created_at timestamptz not null default now(),
  unique (patient_id, viewer_id)
);

create table if not exists public.care_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  provider_role text not null check (provider_role in ('doctor', 'caregiver')),
  request_type text not null default 'record_review',
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (patient_id, provider_id)
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  dosage text not null,
  frequency text not null,
  reminder_time time not null,
  start_date date not null,
  instructions text not null default '',
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('taken', 'missed', 'skipped')),
  logged_at timestamptz not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.fitness_metrics (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  metric_date date not null,
  steps integer not null default 0,
  calories integer not null default 0,
  sleep_hours numeric not null default 0,
  water_liters numeric not null default 0,
  mood text not null default 'Okay',
  created_at timestamptz not null default now()
);

create table if not exists public.health_goals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  target numeric not null,
  current numeric not null default 0,
  unit text not null,
  due_date date not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.care_access enable row level security;
alter table public.care_requests enable row level security;
alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;
alter table public.fitness_metrics enable row level security;
alter table public.health_goals enable row level security;

do $$
begin
  begin
    alter publication supabase_realtime add table public.medications;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.medication_logs;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.fitness_metrics;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.health_goals;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.care_requests;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.care_access;
  exception when duplicate_object then null;
  end;
end;
$$;

drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users read relevant care access" on public.care_access;
drop policy if exists "Providers create accepted access" on public.care_access;
drop policy if exists "Providers update accepted access" on public.care_access;
drop policy if exists "Users read relevant care requests" on public.care_requests;
drop policy if exists "Patients create care requests" on public.care_requests;
drop policy if exists "Patients update own care requests" on public.care_requests;
drop policy if exists "Providers respond to care requests" on public.care_requests;
drop policy if exists "Patients manage own medications" on public.medications;
drop policy if exists "Care viewers add patient medications" on public.medications;
drop policy if exists "Care viewers read patient medications" on public.medications;
drop policy if exists "Patients manage own logs" on public.medication_logs;
drop policy if exists "Care viewers read patient logs" on public.medication_logs;
drop policy if exists "Patients manage own fitness" on public.fitness_metrics;
drop policy if exists "Care viewers read patient fitness" on public.fitness_metrics;
drop policy if exists "Patients manage own goals" on public.health_goals;
drop policy if exists "Care viewers read patient goals" on public.health_goals;

create policy "Users read own profile"
on public.profiles for select
using (
  auth.uid() = id
  or role in ('doctor', 'caregiver')
  or exists (
    select 1 from public.care_requests
    where care_requests.patient_id = profiles.id
    and care_requests.provider_id = auth.uid()
  )
  or exists (
    select 1 from public.care_access
    where care_access.patient_id = profiles.id
    and care_access.viewer_id = auth.uid()
  )
);

create policy "Users insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = id);

create policy "Users read relevant care access"
on public.care_access for select
using (auth.uid() = patient_id or auth.uid() = viewer_id);

create policy "Providers create accepted access"
on public.care_access for insert
with check (auth.uid() = viewer_id);

create policy "Providers update accepted access"
on public.care_access for update
using (auth.uid() = viewer_id)
with check (auth.uid() = viewer_id);

create policy "Users read relevant care requests"
on public.care_requests for select
using (auth.uid() = patient_id or auth.uid() = provider_id);

create policy "Patients create care requests"
on public.care_requests for insert
with check (auth.uid() = patient_id);

create policy "Patients update own care requests"
on public.care_requests for update
using (auth.uid() = patient_id);

create policy "Providers respond to care requests"
on public.care_requests for update
using (auth.uid() = provider_id);

create policy "Patients manage own medications"
on public.medications for all
using (auth.uid() = patient_id)
with check (auth.uid() = patient_id);

create policy "Care viewers add patient medications"
on public.medications for insert
with check (
  auth.uid() = patient_id
  or exists (
    select 1 from public.care_access
    where care_access.patient_id = medications.patient_id
    and care_access.viewer_id = auth.uid()
  )
);

create policy "Care viewers read patient medications"
on public.medications for select
using (
  auth.uid() = patient_id
  or exists (
    select 1 from public.care_access
    where care_access.patient_id = medications.patient_id
    and care_access.viewer_id = auth.uid()
  )
);

create policy "Patients manage own logs"
on public.medication_logs for all
using (auth.uid() = patient_id)
with check (auth.uid() = patient_id);

create policy "Care viewers read patient logs"
on public.medication_logs for select
using (
  auth.uid() = patient_id
  or exists (
    select 1 from public.care_access
    where care_access.patient_id = medication_logs.patient_id
    and care_access.viewer_id = auth.uid()
  )
);

create policy "Patients manage own fitness"
on public.fitness_metrics for all
using (auth.uid() = patient_id)
with check (auth.uid() = patient_id);

create policy "Care viewers read patient fitness"
on public.fitness_metrics for select
using (
  auth.uid() = patient_id
  or exists (
    select 1 from public.care_access
    where care_access.patient_id = fitness_metrics.patient_id
    and care_access.viewer_id = auth.uid()
  )
);

create policy "Patients manage own goals"
on public.health_goals for all
using (auth.uid() = patient_id)
with check (auth.uid() = patient_id);

notify pgrst, 'reload schema';

create policy "Care viewers read patient goals"
on public.health_goals for select
using (
  auth.uid() = patient_id
  or exists (
    select 1 from public.care_access
    where care_access.patient_id = health_goals.patient_id
    and care_access.viewer_id = auth.uid()
  )
);
