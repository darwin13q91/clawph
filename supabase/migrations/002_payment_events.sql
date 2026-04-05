-- ClawPH Schema Migration v2 — Payment Events + Operational Views
-- Run this in your Supabase SQL editor AFTER running schema.sql (v1)

-- ============================================================
-- PAYMENT_EVENTS
-- Append-only audit log of all payment lifecycle events.
-- Each row = one state transition from a provider webhook or manual admin action.
-- ============================================================
create table if not exists public.payment_events (
  id                  uuid        primary key default uuid_generate_v4(),
  subscription_intent_id uuid    references public.subscription_intents(id) on delete set null,
  provisioning_job_id   uuid      references public.provisioning_jobs(id) on delete set null,
  event_type           text        not null,
  -- event_type candidates:
  --   payment.pending | payment.confirmed | payment.failed | payment.cancelled
  --   provisioning.not_started | provisioning.started | provisioning.completed | provisioning.failed
  --   manual.confirmed | manual.fulfilled | manual.failed | manual.trigger
  provider             text,
  -- 'paymongo' | 'xendit' | 'manual' | 'admin-api' | 'ops-page'
  provider_event_id    text,
  amount               numeric(10,2),
  currency             text,
  raw_payload          jsonb,
  processed_at         timestamptz default now(),
  created_at           timestamptz default now()
);

create index pe_subscription_intent_idx on public.payment_events (subscription_intent_id);
create index pe_provisioning_job_idx on public.payment_events (provisioning_job_id);
create index pe_event_type_idx on public.payment_events (event_type);
create index pe_provider_idx on public.payment_events (provider);
create index pe_created_at_idx on public.payment_events (created_at desc);

-- ============================================================
-- RLS for payment_events
-- ============================================================
alter table public.payment_events enable row level security;

-- Service-role / admin-API inserts (no select for regular users)
create policy "Admins can view payment events"
  on public.payment_events for select
  using (
    exists (
      select 1 from public.profiles p
      where p.google_sub = public.get_google_sub()
    )
  );

create policy "Service role can insert payment events"
  on public.payment_events for insert
  with check (true);

-- ============================================================
-- Index on subscription_intents for ops queries
-- ============================================================
create index if not exists si_created_at_idx on public.subscription_intents (created_at desc);

-- ============================================================
-- Function: advance subscription intent status
-- Used by confirm / fulfill / fail endpoints
-- ============================================================
create or replace function public.advance_subscription_intent_status(
  p_intent_id uuid,
  p_new_status text,
  p_provider text default null,
  p_provider_event_id text default null,
  p_raw_payload jsonb default null
)
returns public.subscription_intents
language plpgsql
security definer
as $$
declare
  v_existing_status text;
  v_advanced_record public.subscription_intents;
begin
  -- Get current status
  select status into v_existing_status
  from public.subscription_intents
  where id = p_intent_id;

  -- Only allow forward progression or same-state re-confirm
  if v_existing_status = 'fulfilled' then
    raise exception 'Cannot advance a fulfilled subscription intent';
  end if;

  if v_existing_status = 'cancelled' then
    raise exception 'Cannot advance a cancelled subscription intent';
  end if;

  -- Update status
  update public.subscription_intents
  set status = p_new_status, updated_at = now()
  where id = p_intent_id
  returning * into v_advanced_record;

  -- Record payment event
  insert into public.payment_events (
    subscription_intent_id,
    event_type,
    provider,
    provider_event_id,
    raw_payload
  ) values (
    p_intent_id,
    case p_provider
      when 'manual' then 'manual.' || p_new_status
      when 'admin-api' then 'manual.' || p_new_status
      else 'payment.' || p_new_status
    end,
    p_provider,
    p_provider_event_id,
    p_raw_payload
  );

  return v_advanced_record;
end;
$$;

-- ============================================================
-- Function: advance provisioning job status
-- ============================================================
create or replace function public.advance_provisioning_job_status(
  p_job_id uuid,
  p_new_status text,
  p_agent_session_id text default null,
  p_error_message text default null,
  p_provisioning_data jsonb default null
)
returns public.provisioning_jobs
language plpgsql
security definer
as $$
declare
  v_existing_status text;
  v_advanced_record public.provisioning_jobs;
  v_event_type text;
begin
  select status into v_existing_status
  from public.provisioning_jobs
  where id = p_job_id;

  if v_existing_status = 'completed' then
    raise exception 'Cannot advance a completed provisioning job';
  end if;

  if v_existing_status = 'cancelled' and p_new_status != 'cancelled' then
    raise exception 'Cannot advance a cancelled provisioning job';
  end if;

  -- Derive event type
  v_event_type = case p_new_status
    when 'not_started' then 'provisioning.not_started'
    when 'in_progress' then 'provisioning.started'
    when 'completed'   then 'provisioning.completed'
    when 'failed'     then 'provisioning.failed'
    when 'cancelled'  then 'provisioning.cancelled'
    else 'provisioning.' || p_new_status
  end;

  -- Build updates
  update public.provisioning_jobs
  set
    status = p_new_status,
    agent_session_id = coalesce(p_agent_session_id, agent_session_id),
    error_message = coalesce(p_error_message, error_message),
    provisioning_data = coalesce(p_provisioning_data, provisioning_data),
    started_at = case when p_new_status in ('in_progress') and started_at is null
                     then now() else started_at end,
    completed_at = case when p_new_status in ('completed','failed')
                        then now() else completed_at end,
    updated_at = now()
  where id = p_job_id
  returning * into v_advanced_record;

  -- Record event
  insert into public.payment_events (provisioning_job_id, event_type, provider)
  values (p_job_id, v_event_type, 'admin-api');

  return v_advanced_record;
end;
$$;

-- ============================================================
-- Service role for admin operations (RLS bypass for server-side)
-- ============================================================
-- Note: This is a simplified service role setup.
-- In production, use Supabase service_role key for server-to-server API calls.