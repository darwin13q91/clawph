/**
 * ClawPH Provisioning Runner
 *
 * Actual executable provisioning workflow that processes confirmed subscription jobs.
 *
 * Status machine:
 *   pending → not_started → in_progress → completed | failed | manual_action_required | cancelled
 *
 * Steps executed (in order):
 *   1. VALIDATE_PREREQUISITES  - verify job data, workspace, and prerequisites exist
 *   2. GENERATE_SLUG           - derive/confirm a unique workspace slug
 *   3. CREATE_ARTIFACT_BUNDLE  - write per-customer config, manifest, handoff payload
 *   4. INVOKE_EXTERNAL_HOOK   - call env-configured external provisioning script (if set)
 *   5. FINALIZE                - mark job complete or manual_action_required
 *
 * Honest outcomes:
 *   - If external hook succeeds → completed
 *   - If external hook not configured → manual_action_required (requires ops follow-up)
 *   - If any step fails → failed (with step error preserved)
 */

import { getSupabase } from './supabase';
import {
  updateProvisioningJobStatus,
  getSubscriptionIntentById,
  type ProvisioningJobStatus as DbProvisioningJobStatus,
} from './db-persistence';

// ── Local types (avoid import issues) ────────────────────────────────────────

type ProvisioningRunnerStatus = 'idle' | 'running' | 'error' | 'complete';
type ProvisioningStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface ProvisioningStep {
  id: string;
  label: string;
  description?: string;
  status: ProvisioningStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  data?: Record<string, unknown>;
  manualActionRequired?: boolean;
}

interface ProvisioningRun {
  id: string;
  jobId: string;
  workspaceId: string;
  planId: string;
  status: ProvisioningRunnerStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  steps: ProvisioningStep[];
  metadata?: Record<string, unknown>;
  logs?: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

export const STEP_IDS = {
  VALIDATE_PREREQUISITES: 'validate_prerequisites',
  GENERATE_SLUG: 'generate_slug',
  CREATE_ARTIFACT_BUNDLE: 'create_artifact_bundle',
  INVOKE_EXTERNAL_HOOK: 'invoke_external_hook',
  FINALIZE: 'finalize',
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

export const FINAL_STATUSES: DbProvisioningJobStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'manual_action_required',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(prefix = 'run'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function now(): Date {
  return new Date();
}

function timestamp(): string {
  return new Date().toISOString();
}

function appendLog(run: ProvisioningRun, message: string): void {
  const entry = `[${timestamp()}] ${message}`;
  run.logs = [...(run.logs ?? []), entry];
  console.log(`[ProvisioningRunner:${run.id}] ${entry}`);
}

// ── Step: validate prerequisites ────────────────────────────────────────────

async function stepValidatePrerequisites(run: ProvisioningRun): Promise<void> {
  const step: ProvisioningStep = {
    id: STEP_IDS.VALIDATE_PREREQUISITES,
    label: 'Validate prerequisites',
    status: 'running',
  };
  run.steps = [...run.steps, step];
  appendLog(run, 'Starting prerequisite validation');

  const supabase = getSupabase();

  const { data: job, error: jobError } = await supabase
    .from('provisioning_jobs')
    .select()
    .eq('id', run.jobId)
    .maybeSingle();

  if (jobError || !job) {
    throw new Error(`Provisioning job ${run.jobId} not found`);
  }

  appendLog(run, `Job found: status=${job.status}, plan_id=${job.plan_id}`);

  if (job.subscription_intent_id) {
    const intent = await getSubscriptionIntentById(job.subscription_intent_id);
    if (!intent) {
      throw new Error(`Subscription intent ${job.subscription_intent_id} not found`);
    }
    appendLog(
      run,
      `Intent: ${intent.status} | ${intent.customer_email ?? 'no-email'} | ${intent.plan_name ?? intent.plan_id}`
    );

    if (!['pending', 'confirmed', 'fulfilled'].includes(intent.status)) {
      throw new Error(
        `Subscription intent status is '${intent.status}' — expected pending/confirmed/fulfilled to proceed`
      );
    }

    // Store customer email for later steps
    step.data = { customer_email: intent.customer_email };
  } else {
    appendLog(run, 'WARNING: No subscription_intent_id linked to this job');
  }

  run.steps = run.steps.map((s) =>
    s.id === STEP_IDS.VALIDATE_PREREQUISITES
      ? { ...s, status: 'completed' as const, completedAt: now() }
      : s
  );
  appendLog(run, 'Prerequisite validation passed');
}

// ── Step: generate slug ───────────────────────────────────────────────────────

async function stepGenerateSlug(run: ProvisioningRun): Promise<void> {
  const step: ProvisioningStep = {
    id: STEP_IDS.GENERATE_SLUG,
    label: 'Generate workspace slug',
    status: 'running',
  };
  run.steps = [...run.steps, step];
  appendLog(run, 'Generating workspace slug');

  const supabase = getSupabase();

  let slugBase = run.planId ?? 'tenant';
  let workspaceId = run.workspaceId || '';

  if (run.jobId) {
    const { data: job } = await supabase
      .from('provisioning_jobs')
      .select('subscription_intent_id, workspace_id')
      .eq('id', run.jobId)
      .maybeSingle();

    if (job?.workspace_id) {
      workspaceId = job.workspace_id;
    }

    if (job?.subscription_intent_id) {
      const intent = await getSubscriptionIntentById(job.subscription_intent_id);
      if (intent) {
        const emailPrefix = intent.customer_email?.split('@')[0] ?? 'tenant';
        const company = intent.customer_company
          ? makeSlug(intent.customer_company)
          : makeSlug(emailPrefix);
        slugBase = company || 'tenant';
      }
    }
  }

  const suffix = Date.now().toString(36).slice(-4);
  const slug = `${slugBase}-${suffix}`;
  const name = `${slugBase.replace(/-/g, ' ')} workspace`;

  appendLog(run, `Generated slug: ${slug}, name: ${name}`);

  if (workspaceId) {
    await supabase
      .from('workspaces')
      .update({ slug, name, updated_at: new Date().toISOString() })
      .eq('id', workspaceId);
    appendLog(run, `Updated existing workspace ${workspaceId} with slug`);
  }

  run.steps = run.steps.map((s) =>
    s.id === STEP_IDS.GENERATE_SLUG
      ? { ...s, status: 'completed' as const, completedAt: now(), data: { slug, name, workspaceId } }
      : s
  );
}

// ── Step: create artifact bundle ─────────────────────────────────────────────

async function stepCreateArtifactBundle(run: ProvisioningRun): Promise<void> {
  const step: ProvisioningStep = {
    id: STEP_IDS.CREATE_ARTIFACT_BUNDLE,
    label: 'Create artifact bundle',
    description: 'Write provisioning manifest, config bundle, and handoff payload',
    status: 'running',
  };
  run.steps = [...run.steps, step];
  appendLog(run, 'Creating artifact bundle');

  const supabase = getSupabase();
  const artifactSteps: Array<{ id: string; label: string; completedAt?: string }> = [];

  for (const s of run.steps) {
    if (s.status === 'completed') {
      artifactSteps.push({
        id: s.id,
        label: s.label,
        completedAt: s.completedAt?.toISOString(),
      });
    }
  }

  let customerEmail = '';
  let customerData: Record<string, unknown> = {};

  if (run.jobId) {
    const { data: job } = await supabase
      .from('provisioning_jobs')
      .select('subscription_intent_id')
      .eq('id', run.jobId)
      .maybeSingle();

    if (job?.subscription_intent_id) {
      const intent = await getSubscriptionIntentById(job.subscription_intent_id);
      if (intent) {
        customerEmail = intent.customer_email ?? '';
        customerData = {
          id: intent.id,
          plan_id: intent.plan_id,
          plan_name: intent.plan_name,
          customer_email: intent.customer_email,
          customer_name: intent.customer_name,
          customer_company: intent.customer_company,
          status: intent.status,
        };
      }
    }
  }

  const slugStep = run.steps.find((s) => s.id === STEP_IDS.GENERATE_SLUG);
  const workspaceId = (slugStep?.data?.workspaceId as string) ?? run.workspaceId;

  const bundle = {
    runId: run.id,
    jobId: run.jobId,
    workspaceId,
    planId: run.planId,
    createdAt: timestamp(),
    customer: customerData,
    provisioningSteps: artifactSteps,
    manifest: {
      version: '1.0',
      runner: 'clawph-provisioning-runner',
      environment: process.env.NODE_ENV ?? 'development',
      notes: [
        'This bundle is generated by the ClawPH provisioning runner.',
        'External provisioning hook must be invoked to complete full tenant setup.',
        'If INVOKE_EXTERNAL_HOOK step shows skipped/not_configured, manual follow-up is required.',
      ],
    },
    secretsPlaceholders: {
      openclaw_gateway_url: '{{OPENCLAW_GATEWAY_URL}}',
      openclaw_agent_token: '{{OPENCLAW_AGENT_TOKEN}}',
      tenant_workspace_id: workspaceId || '{{WORKSPACE_ID}}',
      customer_email: customerEmail || '{{CUSTOMER_EMAIL}}',
    },
    setupInstructions: [
      '1. Review the manifest and secrets placeholders above',
      '2. Invoke the external provisioning hook to deploy the tenant environment',
      '3. Replace all {{PLACEHOLDER}} values with actual credentials',
      '4. Confirm workspace is accessible and report completion to customer',
    ],
  };

  appendLog(run, `Artifact bundle created with ${Object.keys(bundle).length} top-level keys`);

  run.steps = run.steps.map((s) =>
    s.id === STEP_IDS.CREATE_ARTIFACT_BUNDLE
      ? { ...s, status: 'completed' as const, completedAt: now(), data: { bundle } }
      : s
  );
}

// ── Step: invoke external hook ────────────────────────────────────────────────

async function stepInvokeExternalHook(run: ProvisioningRun): Promise<void> {
  const step: ProvisioningStep = {
    id: STEP_IDS.INVOKE_EXTERNAL_HOOK,
    label: 'Invoke external provisioning hook',
    description: 'Call env-configured shell command or script for actual tenant deployment',
    status: 'running',
  };
  run.steps = [...run.steps, step];

  const commandTemplate = process.env.PROVISIONING_COMMAND_TEMPLATE;
  const scriptPath = process.env.PROVISIONING_SCRIPT_PATH;

  if (!commandTemplate && !scriptPath) {
    appendLog(
      run,
      'No external provisioning hook configured (PROVISIONING_COMMAND_TEMPLATE / PROVISIONING_SCRIPT_PATH not set)'
    );
    appendLog(
      run,
      'Marking step as manual_action_required — operator must invoke external provisioning manually'
    );

    run.steps = run.steps.map((s) =>
      s.id === STEP_IDS.INVOKE_EXTERNAL_HOOK
        ? {
            ...s,
            status: 'skipped' as const,
            completedAt: now(),
            manualActionRequired: true,
            data: {
              reason: 'no_external_hook_configured',
              message:
                'Set PROVISIONING_COMMAND_TEMPLATE or PROVISIONING_SCRIPT_PATH env var to enable automated provisioning.',
              instructions: [
                'PROVISIONING_COMMAND_TEMPLATE: shell command string with placeholders',
                '  Placeholders: {{JOB_ID}}, {{WORKSPACE_ID}}, {{PLAN_ID}}, {{SLUG}}, {{CUSTOMER_EMAIL}}',
                'PROVISIONING_SCRIPT_PATH: absolute path to a shell script to execute',
                'The script receives env vars: CLAWPH_JOB_ID, CLAWPH_WORKSPACE_ID, CLAWPH_PLAN_ID, CLAWPH_SLUG, CLAWPH_CUSTOMER_EMAIL, CLAWPH_RUN_ID',
              ],
            },
          }
        : s
    );
    return;
  }

  // Build the command
  let command: string;
  if (commandTemplate) {
    const slugStep = run.steps.find((s) => s.id === STEP_IDS.GENERATE_SLUG);
    const emailStep = run.steps.find((s) => s.id === STEP_IDS.VALIDATE_PREREQUISITES);
    command = commandTemplate
      .replace(/\{\{JOB_ID\}\}/g, run.jobId)
      .replace(/\{\{WORKSPACE_ID\}\}/g, run.workspaceId ?? '')
      .replace(/\{\{PLAN_ID\}\}/g, run.planId ?? '')
      .replace(/\{\{SLUG\}\}/g, (slugStep?.data?.slug as string) ?? '')
      .replace(/\{\{CUSTOMER_EMAIL\}\}/g, (emailStep?.data?.customer_email as string) ?? '');
  } else {
    command = scriptPath!;
  }

  appendLog(run, `Executing external hook: ${command}`);

  try {
    const { execSync } = await import('child_process');
    const timeoutSeconds = Number(process.env.PROVISIONING_TIMEOUT_SECONDS ?? 120);
    const slugStep = run.steps.find((s) => s.id === STEP_IDS.GENERATE_SLUG);
    const emailStep = run.steps.find((s) => s.id === STEP_IDS.VALIDATE_PREREQUISITES);
    const extraEnv: Record<string, string> = {
      CLAWPH_JOB_ID: run.jobId,
      CLAWPH_WORKSPACE_ID: run.workspaceId ?? '',
      CLAWPH_PLAN_ID: run.planId ?? '',
      CLAWPH_SLUG: (slugStep?.data?.slug as string) ?? '',
      CLAWPH_CUSTOMER_EMAIL: (emailStep?.data?.customer_email as string) ?? '',
      CLAWPH_RUN_ID: run.id,
    };

    const result = execSync(command, {
      timeout: timeoutSeconds * 1000,
      encoding: 'utf-8',
      env: { ...process.env, ...extraEnv },
    });

    appendLog(run, `External hook stdout: ${String(result).slice(0, 500)}`);
    run.steps = run.steps.map((s) =>
      s.id === STEP_IDS.INVOKE_EXTERNAL_HOOK
        ? { ...s, status: 'completed' as const, completedAt: now(), data: { stdout: String(result).slice(0, 2000) } }
        : s
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? `${err.message}` : String(err);
    appendLog(run, `External hook failed: ${errorMessage}`);
    run.steps = run.steps.map((s) =>
      s.id === STEP_IDS.INVOKE_EXTERNAL_HOOK
        ? {
            ...s,
            status: 'failed' as const,
            completedAt: now(),
            error: `External hook error: ${errorMessage}`,
          }
        : s
    );
    throw err;
  }
}

// ── Step: finalize ───────────────────────────────────────────────────────────

async function stepFinalize(run: ProvisioningRun): Promise<void> {
  const step: ProvisioningStep = {
    id: STEP_IDS.FINALIZE,
    label: 'Finalize provisioning record',
    status: 'running',
  };
  run.steps = [...run.steps, step];

  const externalHookStep = run.steps.find((s) => s.id === STEP_IDS.INVOKE_EXTERNAL_HOOK);
  const externalHookSkipped = externalHookStep?.status === 'skipped';
  const externalHookFailed = externalHookStep?.status === 'failed';

  let finalStatus: DbProvisioningJobStatus;
  if (externalHookFailed) {
    finalStatus = 'failed';
  } else if (externalHookSkipped) {
    finalStatus = 'manual_action_required';
  } else {
    finalStatus = 'completed';
  }

  const provisioningData = {
    runId: run.id,
    steps: run.steps.map((s) => ({
      id: s.id,
      label: s.label,
      status: s.status,
      error: s.error,
      manualActionRequired: s.manualActionRequired,
      completedAt: s.completedAt?.toISOString(),
    })),
    logs: run.logs,
    bundle: run.steps.find((s) => s.id === STEP_IDS.CREATE_ARTIFACT_BUNDLE)?.data,
    externalHookConfigured: !externalHookSkipped && !externalHookFailed,
    finalizedAt: timestamp(),
  };

  await updateProvisioningJobStatus(run.jobId, finalStatus, {
    startedAt: run.startedAt,
    completedAt: now(),
    provisioningData,
    errorMessage:
      finalStatus === 'failed'
        ? externalHookStep?.error
        : finalStatus === 'manual_action_required'
          ? 'External provisioning hook not configured — manual follow-up required'
          : undefined,
  });

  run.steps = run.steps.map((s) =>
    s.id === STEP_IDS.FINALIZE ? { ...s, status: 'completed' as const, completedAt: now() } : s
  );

  appendLog(run, `Provisioning finalized: status=${finalStatus}`);
}

// ── Step order ───────────────────────────────────────────────────────────────

const STEP_FUNCTIONS: Array<{ id: StepId; fn: (run: ProvisioningRun) => Promise<void> }> = [
  { id: STEP_IDS.VALIDATE_PREREQUISITES, fn: stepValidatePrerequisites },
  { id: STEP_IDS.GENERATE_SLUG, fn: stepGenerateSlug },
  { id: STEP_IDS.CREATE_ARTIFACT_BUNDLE, fn: stepCreateArtifactBundle },
  { id: STEP_IDS.INVOKE_EXTERNAL_HOOK, fn: stepInvokeExternalHook },
  { id: STEP_IDS.FINALIZE, fn: stepFinalize },
];

// ── Main runner ─────────────────────────────────────────────────────────────

/**
 * Run the full provisioning workflow for a single job.
 *
 * Runs steps sequentially. Throws if a step fails — caller should catch
 * and update job status to 'failed' if unhandled.
 *
 * Idempotent: if the job is already past 'in_progress', re-running will
 * attempt to re-provision from in_progress state. Jobs in final statuses
 * are left unchanged.
 */
export async function runProvisioningJob(
  jobId: string,
  options?: { workspaceId?: string; planId?: string }
): Promise<ProvisioningRun> {
  const run: ProvisioningRun = {
    id: generateId('run'),
    jobId,
    workspaceId: options?.workspaceId ?? '',
    planId: options?.planId ?? '',
    status: 'running',
    startedAt: now(),
    steps: [],
    logs: [],
  };

  appendLog(run, `Starting provisioning run for job ${jobId}`);

  // Check current status — skip if already in a final state
  const supabase = getSupabase();
  const { data: currentJob } = await supabase
    .from('provisioning_jobs')
    .select('id, status')
    .eq('id', jobId)
    .maybeSingle();

  if (!currentJob) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (FINAL_STATUSES.includes(currentJob.status as DbProvisioningJobStatus)) {
    appendLog(run, `Job is in final status '${currentJob.status}' — skipping`);
    run.status = 'complete';
    return run;
  }

  await updateProvisioningJobStatus(jobId, 'in_progress', {
    startedAt: run.startedAt,
  });

  try {
    for (const { fn } of STEP_FUNCTIONS) {
      await fn(run);
    }

    const lastStep = run.steps[run.steps.length - 1];
    if (lastStep?.status === 'failed') {
      run.status = 'error';
      appendLog(run, `Provisioning run error at step ${lastStep.id}: ${lastStep.error}`);
    } else {
      run.status = 'complete';
      appendLog(run, 'Provisioning run completed successfully');
    }
  } catch (err) {
    run.status = 'error';
    const msg = err instanceof Error ? err.message : String(err);
    appendLog(run, `Provisioning run threw: ${msg}`);
    await updateProvisioningJobStatus(jobId, 'failed', {
      completedAt: now(),
      errorMessage: msg,
    });
    throw err;
  }

  return run;
}

/**
 * Fetch the next pending/not_started provisioning job from the database.
 */
export async function fetchNextPendingJob(): Promise<{ id: string; workspaceId?: string; planId?: string } | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('provisioning_jobs')
    .select('id, workspace_id, plan_id')
    .in('status', ['pending', 'not_started'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch next pending job: ${error.message}`);
  if (!data) return null;

  return { id: data.id, workspaceId: data.workspace_id ?? undefined, planId: data.plan_id ?? undefined };
}

/**
 * List provisioning jobs for admin display.
 */
export async function listProvisioningJobs(options?: {
  limit?: number;
}): Promise<Array<{
  id: string;
  status: string;
  plan_id: string | null;
  workspace_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  subscription_intent: { customer_email: string | null; plan_name: string | null; checkout_request_id: string | null } | null;
  provisioning_data: Record<string, unknown> | null;
}>> {
  const supabase = getSupabase();

  let query = supabase
    .from('provisioning_jobs')
    .select(
      `
      id,
      status,
      plan_id,
      workspace_id,
      started_at,
      completed_at,
      error_message,
      created_at,
      subscription_intent:subscription_intents(customer_email, plan_name, checkout_request_id),
      provisioning_data
    `
    )
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list provisioning jobs: ${error.message}`);

  return (data as unknown as Array<{
    id: string;
    status: string;
    plan_id: string | null;
    workspace_id: string | null;
    started_at: string | null;
    completed_at: string | null;
    error_message: string | null;
    created_at: string;
    subscription_intent: { customer_email: string | null; plan_name: string | null; checkout_request_id: string | null } | null;
    provisioning_data: Record<string, unknown> | null;
  }>) ?? [];
}

// ── Exports for API routes ───────────────────────────────────────────────────

export { updateProvisioningJobStatus };
export type { ProvisioningJobStatus } from './db-persistence';
