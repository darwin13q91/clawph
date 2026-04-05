/**
 * ClawPH persistence service — wraps Supabase for all app-level state.
 *
 * Design principles:
 * - Upsert-first for profiles (idempotent, handles re-auth)
 * - Workspace is created-on-demand per authenticated user (one default workspace)
 * - subscription_intent is always created on checkout (never updated — append-only audit trail)
 * - provisioning_job is created in a pending state; state transitions are explicit update calls
 *
 * This module is intentionally thin — no business logic, just persistence primitives.
 * All transactional grouping (e.g. create subscription_intent + provisioning_job together)
 * should be done by the caller in the API route.
 */

import { getSupabase } from './supabase';
import type { SessionPayload } from '../../api/auth/_lib';
import type { PricingPlanId, PaymentMethodId } from '../../api/payments/_lib';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DbProfile {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWorkspace {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbSubscriptionIntent {
  id: string;
  profile_id: string | null;
  workspace_id: string | null;
  plan_id: string;
  plan_name: string | null;
  billing_label: string | null;
  currency: string;
  amount_local: number | null;
  amount_usd: number | null;
  payment_method_id: string | null;
  status: string;
  checkout_request_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_company: string | null;
  customer_country: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbProvisioningJob {
  id: string;
  subscription_intent_id: string | null;
  workspace_id: string | null;
  plan_id: string | null;
  status: string;
  agent_session_id: string | null;
  provisioning_data: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPaymentEvent {
  id: string;
  subscription_intent_id: string | null;
  provisioning_job_id: string | null;
  event_type: string;
  provider: string | null;
  provider_event_id: string | null;
  amount: number | null;
  currency: string | null;
  raw_payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

// ── Profile operations ──────────────────────────────────────────────────────

/**
 * Upsert a profile from an authenticated Google session.
 * Idempotent — safe to call on every checkout for verified identity.
 */
export async function upsertProfile(session: SessionPayload): Promise<DbProfile> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        google_sub: session.sub,
        email: session.email,
        name: session.name ?? null,
        picture: session.picture ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'google_sub',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
  return data as DbProfile;
}

/**
 * Find a profile by Google sub.
 */
export async function getProfileByGoogleSub(googleSub: string): Promise<DbProfile | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .select()
    .eq('google_sub', googleSub)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get profile: ${error.message}`);
  }
  return data as DbProfile | null;
}

// ── Workspace operations ────────────────────────────────────────────────────

/**
 * Get or create a default workspace for a profile.
 * Each authenticated user gets one default workspace named after their email prefix.
 */
export async function getOrCreateDefaultWorkspace(
  profileId: string,
  email: string
): Promise<DbWorkspace> {
  const supabase = getSupabase();

  // Derive a slug from the email prefix
  const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);

  // Try to find existing workspace for this profile
  const { data: existingMembership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('profile_id', profileId)
    .limit(1)
    .single();

  if (existingMembership) {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select()
      .eq('id', existingMembership.workspace_id)
      .single();

    if (!error && workspace) {
      return workspace as DbWorkspace;
    }
  }

  // Create new workspace
  const workspaceName = `${slug} workspace`;
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name: workspaceName, slug: `${slug}-${Date.now().toString(36)}` })
    .select()
    .single();

  if (wsError) throw new Error(`Failed to create workspace: ${wsError.message}`);

  // Create membership linking profile to workspace
  const { error: memberError } = await supabase
    .from('workspace_memberships')
    .insert({ workspace_id: workspace.id, profile_id: profileId, role: 'owner' });

  if (memberError) throw new Error(`Failed to create workspace membership: ${memberError.message}`);

  return workspace as DbWorkspace;
}

// ── Subscription intent operations ──────────────────────────────────────────

export type SubscriptionIntentStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'fulfilled';

export interface CreateSubscriptionIntentInput {
  profileId?: string;
  workspaceId?: string;
  planId: PricingPlanId;
  planName?: string;
  billingLabel?: string;
  currency: string;
  amountLocal?: number;
  amountUsd?: number;
  paymentMethodId: PaymentMethodId;
  checkoutRequestId?: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerCountry?: string;
  notes?: string;
}

/**
 * Create a new subscription intent record.
 * Append-only — represents one checkout request attempt.
 */
export async function createSubscriptionIntent(
  input: CreateSubscriptionIntentInput
): Promise<DbSubscriptionIntent> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('subscription_intents')
    .insert({
      profile_id: input.profileId ?? null,
      workspace_id: input.workspaceId ?? null,
      plan_id: input.planId,
      plan_name: input.planName ?? null,
      billing_label: input.billingLabel ?? null,
      currency: input.currency,
      amount_local: input.amountLocal ?? null,
      amount_usd: input.amountUsd ?? null,
      payment_method_id: input.paymentMethodId,
      status: 'pending',
      checkout_request_id: input.checkoutRequestId ?? null,
      customer_name: input.customerName ?? null,
      customer_email: input.customerEmail ?? null,
      customer_company: input.customerCompany ?? null,
      customer_country: input.customerCountry ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create subscription intent: ${error.message}`);
  return data as DbSubscriptionIntent;
}

export async function updateSubscriptionIntentStatus(
  subscriptionIntentId: string,
  status: SubscriptionIntentStatus
): Promise<DbSubscriptionIntent> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('subscription_intents')
    .update({ status })
    .eq('id', subscriptionIntentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update subscription intent: ${error.message}`);
  return data as DbSubscriptionIntent;
}

export async function getSubscriptionIntentById(
  subscriptionIntentId: string
): Promise<DbSubscriptionIntent | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('subscription_intents')
    .select()
    .eq('id', subscriptionIntentId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load subscription intent: ${error.message}`);
  return data as DbSubscriptionIntent | null;
}

export async function recordPaymentEvent(input: {
  subscriptionIntentId?: string;
  provisioningJobId?: string;
  eventType: string;
  provider?: string;
  providerEventId?: string;
  amount?: number;
  currency?: string;
  rawPayload?: Record<string, unknown>;
}): Promise<DbPaymentEvent> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('payment_events')
    .insert({
      subscription_intent_id: input.subscriptionIntentId ?? null,
      provisioning_job_id: input.provisioningJobId ?? null,
      event_type: input.eventType,
      provider: input.provider ?? null,
      provider_event_id: input.providerEventId ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      raw_payload: input.rawPayload ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record payment event: ${error.message}`);
  return data as DbPaymentEvent;
}

// ── Provisioning job operations ─────────────────────────────────────────────

export type ProvisioningJobStatus =
  | 'pending'
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'manual_action_required';

/**
 * Create a provisioning job in a pending state.
 * Call updateProvisioningJobStatus() to advance state.
 */
export async function createProvisioningJob(input: {
  subscriptionIntentId?: string;
  workspaceId?: string;
  planId?: string;
}): Promise<DbProvisioningJob> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('provisioning_jobs')
    .insert({
      subscription_intent_id: input.subscriptionIntentId ?? null,
      workspace_id: input.workspaceId ?? null,
      plan_id: input.planId ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create provisioning job: ${error.message}`);
  return data as DbProvisioningJob;
}

export async function getProvisioningJobBySubscriptionIntentId(
  subscriptionIntentId: string
): Promise<DbProvisioningJob | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('provisioning_jobs')
    .select()
    .eq('subscription_intent_id', subscriptionIntentId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load provisioning job: ${error.message}`);
  return data as DbProvisioningJob | null;
}

export async function queueProvisioningJobForIntent(subscriptionIntentId: string): Promise<DbProvisioningJob> {
  const existing = await getProvisioningJobBySubscriptionIntentId(subscriptionIntentId);
  if (existing) {
    return updateProvisioningJobStatus(existing.id, 'not_started');
  }

  const intent = await getSubscriptionIntentById(subscriptionIntentId);
  if (!intent) {
    throw new Error('Cannot queue provisioning job: subscription intent not found');
  }

  return createProvisioningJob({
    subscriptionIntentId: intent.id,
    workspaceId: intent.workspace_id ?? undefined,
    planId: intent.plan_id,
  });
}

/**
 * Update the status of a provisioning job.
 * Used to transition: pending → not_started → in_progress → completed/failed
 */
export async function updateProvisioningJobStatus(
  jobId: string,
  status: ProvisioningJobStatus,
  extra?: {
    startedAt?: Date;
    completedAt?: Date;
    agentSessionId?: string;
    errorMessage?: string;
    provisioningData?: Record<string, unknown>;
  }
): Promise<DbProvisioningJob> {
  const supabase = getSupabase();

  const updates: Record<string, unknown> = { status };

  if (extra?.startedAt) updates.started_at = extra.startedAt.toISOString();
  if (extra?.completedAt) updates.completed_at = extra.completedAt.toISOString();
  if (extra?.agentSessionId) updates.agent_session_id = extra.agentSessionId;
  if (extra?.errorMessage) updates.error_message = extra.errorMessage;
  if (extra?.provisioningData) {
    updates.provisioning_data = extra.provisioningData;
  }

  const { data, error } = await supabase
    .from('provisioning_jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update provisioning job: ${error.message}`);
  return data as DbProvisioningJob;
}

// ── Full checkout persistence flow ────────────────────────────────────────────

export interface PersistCheckoutOptions {
  session: SessionPayload | null;
  checkoutRequestId: string;
  planId: PricingPlanId;
  planName: string;
  billingLabel: string;
  currency: string;
  amountLocal: number;
  amountUsd: number;
  paymentMethodId: PaymentMethodId;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerCountry?: string;
  notes?: string;
}

/**
 * Full persistence flow for a checkout request.
 *
 * Steps:
 * 1. Upsert profile (if authenticated)
 * 2. Get/create default workspace (if authenticated)
 * 3. Create subscription_intent record
 * 4. Create provisioning_job in pending state
 *
 * All steps are independent inserts — if one fails, the others may succeed.
 * The caller is responsible for error handling and reporting partial failures.
 */
export async function persistCheckout(options: PersistCheckoutOptions): Promise<{
  profile?: DbProfile;
  workspace?: DbWorkspace;
  subscriptionIntent: DbSubscriptionIntent;
  provisioningJob: DbProvisioningJob;
}> {
  let profile: DbProfile | undefined;
  let workspace: DbWorkspace | undefined;

  // 1. Upsert profile if authenticated
  if (options.session) {
    profile = await upsertProfile(options.session);

    // 2. Get or create default workspace
    workspace = await getOrCreateDefaultWorkspace(profile.id, options.session.email);
  }

  // 3. Create subscription intent
  const subscriptionIntent = await createSubscriptionIntent({
    profileId: profile?.id,
    workspaceId: workspace?.id,
    planId: options.planId,
    planName: options.planName,
    billingLabel: options.billingLabel,
    currency: options.currency,
    amountLocal: options.amountLocal,
    amountUsd: options.amountUsd,
    paymentMethodId: options.paymentMethodId,
    checkoutRequestId: options.checkoutRequestId,
    customerName: options.customerName,
    customerEmail: options.customerEmail,
    customerCompany: options.customerCompany,
    customerCountry: options.customerCountry,
    notes: options.notes,
  });

  // 4. Create provisioning job in pending state
  const provisioningJob = await createProvisioningJob({
    subscriptionIntentId: subscriptionIntent.id,
    workspaceId: workspace?.id,
    planId: options.planId,
  });

  return { profile, workspace, subscriptionIntent, provisioningJob };
}
