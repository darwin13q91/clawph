-- ClawPH Supabase Schema v1.0
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- One per Google user (keyed by Google sub claim)
-- ============================================================
create table if not exists public.profiles (
  id          uuid        primary key default uuid_generate_v4(),
  google_sub  text        unique not null,
  email       text        not null,
  name        text,
  picture     text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index profiles_google_sub_idx on public.profiles (google_sub);
create index profiles_email_idx on public.profiles (email);

-- ============================================================
-- WORKSPACES
-- Each customer account = one workspace
-- ============================================================
create table if not exists public.workspaces (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  slug        text        unique not null,
  plan_id     text,
  status      text        not null default 'active',
  metadata    jsonb       default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index workspaces_slug_idx on public.workspaces (slug);
create index workspaces_status_idx on public.workspaces (status);

-- ============================================================
-- WORKSPACE MEMBERSHIPS
-- Links profiles to workspaces (future multi-seat support)
-- ============================================================
create table if not exists public.workspace_memberships (
  id          uuid        primary key default uuid_generate_v4(),
  workspace_id uuid       references public.workspaces(id) on delete cascade,
  profile_id  uuid        references public.profiles(id) on delete cascade,
  role        text        not null default 'owner',
  created_at  timestamptz default now(),
  unique(workspace_id, profile_id)
);

create index wm_workspace_idx on public.workspace_memberships (workspace_id);
create index wm_profile_idx on public.workspace_memberships (profile_id);

-- ============================================================
-- SUBSCRIPTION INTENTS
-- Checkout requests — the source of truth for billing state
-- ============================================================
create table if not exists public.subscription_intents (
  id                  uuid        primary key default uuid_generate_v4(),
  profile_id          uuid        references public.profiles(id),
  workspace_id        uuid        references public.workspaces(id),
  plan_id             text        not null,
  plan_name           text,
  billing_label       text,
  currency            text        not null default 'USD',
  amount_local        numeric(10,2),
  amount_usd          numeric(10,2),
  payment_method_id   text,
  status              text        not null default 'pending',
  -- status: pending | confirmed | failed | cancelled | fulfilled
  checkout_request_id text,
  customer_name       text,
  customer_email      text,
  customer_company    text,
  customer_country    text,
  notes               text,
  metadata            jsonb       default '{}',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index si_profile_idx on public.subscription_intents (profile_id);
create index si_workspace_idx on public.subscription_intents (workspace_id);
create index si_status_idx on public.subscription_intents (status);
create index si_email_idx on public.subscription_intents (customer_email);
create index si_checkout_request_id_idx on public.subscription_intents (checkout_request_id);

-- ============================================================
-- PROVISIONING JOBS
-- Tracks install/setup jobs triggered by confirmed subscriptions
-- ============================================================
create table if not exists public.provisioning_jobs (
  id                  uuid        primary key default uuid_generate_v4(),
  subscription_intent_id uuid    references public.subscription_intents(id) on delete set null,
  workspace_id        uuid        references public.workspaces(id),
  plan_id             text,
  status              text        not null default 'pending',
  -- status: pending | not_started | in_progress | completed | failed | cancelled
  agent_session_id    text,
  provisioning_data   jsonb       default '{}',
  started_at          timestamptz,
  completed_at       timestamptz,
  error_message       text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index pj_subscription_intent_idx on public.provisioning_jobs (subscription_intent_id);
create index pj_workspace_idx on public.provisioning_jobs (workspace_id);
create index pj_status_idx on public.provisioning_jobs (status);

-- ============================================================
-- Row Level Security (RLS) — starter policies
-- Authenticated users can only read/write their own profile rows
-- via the google_sub claim in auth.jwt()
-- ============================================================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.subscription_intents enable row level security;
alter table public.provisioning_jobs enable row level security;

-- Helper: get current user's Google sub from JWT
create or replace function public.get_google_sub()
returns text
language sql
security definer
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.sub', true), '')
  );
$$;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select
  using (google_sub = public.get_google_sub());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (google_sub = public.get_google_sub());

create policy "Users can update own profile"
  on public.profiles for update
  using (google_sub = public.get_google_sub());

-- WORKSPACES policies (membership-gated)
create policy "Members can view workspaces"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_memberships wm
      join public.profiles p on p.id = wm.profile_id
      where wm.workspace_id = public.workspaces.id
      and p.google_sub = public.get_google_sub()
    )
  );

create policy "Members can insert workspaces"
  on public.workspaces for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.google_sub = public.get_google_sub()
    )
  );

-- WORKSPACE_MEMBERSHIPS policies
create policy "Members can view own memberships"
  on public.workspace_memberships for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = workspace_memberships.profile_id
      and p.google_sub = public.get_google_sub()
    )
  );

create policy "Members can insert own memberships"
  on public.workspace_memberships for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = workspace_memberships.profile_id
      and p.google_sub = public.get_google_sub()
    )
  );

-- SUBSCRIPTION_INTENTS policies
create policy "Users can view own subscription intents"
  on public.subscription_intents for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = subscription_intents.profile_id
      and p.google_sub = public.get_google_sub()
    )
  );

create policy "Anyone can insert subscription intents (checkout public endpoint)"
  on public.subscription_intents for insert
  with check (true);

create policy "Users can update own subscription intents"
  on public.subscription_intents for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = subscription_intents.profile_id
      and p.google_sub = public.get_google_sub()
    )
  );

-- PROVISIONING_JOBS policies
create policy "Users can view own provisioning jobs"
  on public.provisioning_jobs for select
  using (
    exists (
      select 1 from public.workspaces w
      join public.workspace_memberships wm on wm.workspace_id = w.id
      join public.profiles p on p.id = wm.profile_id
      where w.id = provisioning_jobs.workspace_id
      and p.google_sub = public.get_google_sub()
    )
  );

create policy "Service role can insert provisioning jobs"
  on public.provisioning_jobs for insert
  with check (true);

create policy "Service role can update provisioning jobs"
  on public.provisioning_jobs for update
  using (true);

-- ============================================================
-- Updated_at trigger helper
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.handle_updated_at();

create trigger set_subscription_intents_updated_at
  before update on public.subscription_intents
  for each row execute function public.handle_updated_at();

create trigger set_provisioning_jobs_updated_at
  before update on public.provisioning_jobs
  for each row execute function public.handle_updated_at();
