import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors, getSessionFromRequest } from './auth/_lib';
import { getSupabase } from '../src/lib/supabase';
import {
  queueProvisioningJobForIntent,
  recordPaymentEvent,
  updateProvisioningJobStatus,
  updateSubscriptionIntentStatus,
} from '../src/lib/db-persistence';

export type SubscriptionIntentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'fulfilled';
export type ProvisioningJobStatus = 'pending' | 'not_started' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'manual_action_required';

const OPS_EMAILS = new Set(
  [process.env.OPS_EMAIL, process.env.ADMIN_EMAIL, process.env.PAYMENT_NOTIFICATION_EMAIL]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean))
);

async function assertOpsAccess(req: VercelRequest): Promise<void> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    throw new Error('Unauthorized');
  }

  if (OPS_EMAILS.size > 0 && !OPS_EMAILS.has(session.email.toLowerCase())) {
    throw new Error('Forbidden');
  }
}

async function listOperationalData(type: string) {
  const supabase = getSupabase();

  const result: {
    intents?: unknown[];
    jobs?: unknown[];
    events?: unknown[];
  } = {};

  const includeIntents = type === 'all' || type === 'intents';
  const includeJobs = type === 'all' || type === 'jobs' || type === 'provisioning';
  const includeEvents = type === 'all' || type === 'events';

  const [intentsRes, jobsRes, eventsRes, workspacesRes] = await Promise.all([
    includeIntents
      ? supabase.from('subscription_intents').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    includeJobs
      ? supabase.from('provisioning_jobs').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    includeEvents
      ? supabase.from('payment_events').select('*').order('created_at', { ascending: false })
      : Promise.resolve({ data: null, error: null }),
    includeJobs || includeIntents
      ? supabase.from('workspaces').select('id, name, slug')
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (intentsRes.error) throw new Error(`Failed to list subscription intents: ${intentsRes.error.message}`);
  if (jobsRes.error) throw new Error(`Failed to list provisioning jobs: ${jobsRes.error.message}`);
  if (eventsRes.error) throw new Error(`Failed to list payment events: ${eventsRes.error.message}`);
  if (workspacesRes.error) throw new Error(`Failed to list workspaces: ${workspacesRes.error.message}`);

  const intentMap = new Map<string, any>();
  const workspaceMap = new Map<string, { id: string; name: string; slug: string }>();
  const jobMap = new Map<string, any>();

  (intentsRes.data ?? []).forEach((intent: any) => {
    intentMap.set(intent.id, intent);
  });

  (workspacesRes.data ?? []).forEach((workspace: any) => {
    workspaceMap.set(workspace.id, workspace);
  });

  (jobsRes.data ?? []).forEach((job: any) => {
    jobMap.set(job.id, job);
  });

  if (includeIntents) {
    result.intents = intentsRes.data ?? [];
  }

  if (includeJobs) {
    result.jobs = (jobsRes.data ?? []).map((job: any) => ({
      ...job,
      subscription_intent: job.subscription_intent_id ? intentMap.get(job.subscription_intent_id) ?? null : null,
      workspace: job.workspace_id ? workspaceMap.get(job.workspace_id) ?? null : null,
    }));
  }

  if (includeEvents) {
    result.events = (eventsRes.data ?? []).map((event: any) => ({
      ...event,
      subscription_intent: event.subscription_intent_id ? intentMap.get(event.subscription_intent_id) ?? null : null,
      provisioning_job: event.provisioning_job_id ? jobMap.get(event.provisioning_job_id) ?? null : null,
    }));
  }

  return result;
}

async function handleConfirmIntent(req: VercelRequest, res: VercelResponse) {
  const { intentId, status, provider, providerEventId, rawPayload } = req.body ?? {};
  if (!intentId || !status) {
    return res.status(400).json({ success: false, error: 'intentId and status are required' });
  }

  const updatedIntent = await updateSubscriptionIntentStatus(intentId, status as SubscriptionIntentStatus);
  await recordPaymentEvent({
    subscriptionIntentId: intentId,
    eventType: status === 'confirmed' ? 'payment.confirmed' : `payment.${status}`,
    provider: provider ?? 'admin-api',
    providerEventId: providerEventId ?? null,
    rawPayload: rawPayload ?? { source: 'ops-confirm' },
  });

  if (status === 'confirmed') {
    await queueProvisioningJobForIntent(intentId);
  } else if (status === 'failed' || status === 'cancelled') {
    const supabase = getSupabase();
    const { data: job } = await supabase
      .from('provisioning_jobs')
      .select('id')
      .eq('subscription_intent_id', intentId)
      .maybeSingle();
    if (job?.id) {
      await updateProvisioningJobStatus(job.id, 'cancelled', {
        errorMessage: `Intent ${status} via ops`,
      });
    }
  }

  return res.status(200).json({ success: true, intent: updatedIntent });
}

async function handleUpdateJob(req: VercelRequest, res: VercelResponse) {
  const { jobId, status, agentSessionId, errorMessage, provisioningData } = req.body ?? {};
  if (!jobId || !status) {
    return res.status(400).json({ success: false, error: 'jobId and status are required' });
  }

  const job = await updateProvisioningJobStatus(jobId, status as ProvisioningJobStatus, {
    agentSessionId: typeof agentSessionId === 'string' ? agentSessionId : undefined,
    errorMessage: typeof errorMessage === 'string' ? errorMessage : undefined,
    provisioningData: provisioningData && typeof provisioningData === 'object' ? provisioningData : undefined,
    startedAt: status === 'in_progress' ? new Date() : undefined,
    completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
  });

  await recordPaymentEvent({
    provisioningJobId: jobId,
    eventType: status === 'in_progress' ? 'provisioning.started' : `provisioning.${status}`,
    provider: 'admin-api',
    providerEventId: typeof agentSessionId === 'string' ? agentSessionId : undefined,
    rawPayload: {
      status,
      agentSessionId: typeof agentSessionId === 'string' ? agentSessionId : null,
      errorMessage: typeof errorMessage === 'string' ? errorMessage : null,
    },
  });

  return res.status(200).json({ success: true, job });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res, req.headers.origin);

  try {
    await assertOpsAccess(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return res.status(status).json({ success: false, error: message });
  }

  if (req.method === 'GET') {
    const type = typeof req.query.type === 'string' ? req.query.type : 'all';
    try {
      const data = await listOperationalData(type);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error fetching operational data:', error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const action = typeof req.query.action === 'string' ? req.query.action : '';

    try {
      if (action === 'confirm-intent') {
        return await handleConfirmIntent(req, res);
      }

      if (action === 'update-job') {
        return await handleUpdateJob(req, res);
      }

      return res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (error) {
      console.error('Operations action failed:', error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' });
    }
  }

  res.setHeader('Allow', 'GET,POST,OPTIONS');
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
