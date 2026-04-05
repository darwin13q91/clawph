/**
 * POST /api/provisioning
 *
 * Admin trigger endpoint for the ClawPH provisioning runner.
 *
 * Actions:
 *   run-job    — run provisioning for a specific job ID
 *   run-next   — find and run the oldest pending/not_started job
 *   retry-job  — retry a failed job (resets status to not_started then runs)
 *   list-jobs  — return all provisioning jobs (JSON list)
 *   get-job    — return a single job with full provisioning_data
 *
 * Auth: requires ADMIN_SECRET_KEY header matching env var.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;

function unauthorized(res: VercelResponse, message = 'Unauthorized') {
  res.status(401).json({ success: false, error: message });
}

function badRequest(res: VercelResponse, message: string) {
  res.status(400).json({ success: false, error: message });
}

function json(res: VercelResponse, data: unknown, status = 200) {
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!ADMIN_SECRET) {
    return badRequest(res, 'ADMIN_SECRET_KEY is not configured on the server');
  }
  if (req.headers['x-admin-key'] !== ADMIN_SECRET) {
    return unauthorized(res, 'Invalid or missing x-admin-key header');
  }

  if (req.method !== 'POST') {
    return badRequest(res, `Method ${req.method} not allowed — use POST`);
  }

  const { action } = req.query as { action?: string };
  const body = (req.body ?? {}) as { jobId?: string; status?: string };

  // ── Import runner lazily so this file stays a thin Vercel route ──────────
  const {
    runProvisioningJob,
    fetchNextPendingJob,
    listProvisioningJobs,
    updateProvisioningJobStatus,
  } = await import('../src/lib/provisioning-runner');

  try {
    switch (action) {
      case 'run-job': {
        if (!body.jobId) return badRequest(res, 'jobId is required in body');
        const { jobId, workspaceId, planId } = body as { jobId: string; workspaceId?: string; planId?: string };
        const run = await runProvisioningJob(jobId, { workspaceId, planId });
        return json(res, { success: true, run });
      }

      case 'run-next': {
        const next = await fetchNextPendingJob();
        if (!next) {
          return json(res, { success: true, run: null, message: 'No pending jobs found' });
        }
        const run = await runProvisioningJob(next.id, {
          workspaceId: next.workspaceId,
          planId: next.planId,
        });
        return json(res, { success: true, run });
      }

      case 'retry-job': {
        if (!body.jobId) return badRequest(res, 'jobId is required in body');
        await updateProvisioningJobStatus(body.jobId, 'not_started', {
          errorMessage: null,
        });
        const run = await runProvisioningJob(body.jobId);
        return json(res, { success: true, run });
      }

      case 'get-job': {
        if (!body.jobId) return badRequest(res, 'jobId is required in body');
        const jobs = await listProvisioningJobs({ limit: 100 });
        const job = jobs.find((j) => j.id === body.jobId);
        if (!job) return badRequest(res, `Job ${body.jobId} not found`);
        return json(res, { success: true, job });
      }

      case 'list-jobs': {
        const jobs = await listProvisioningJobs({ limit: 50 });
        return json(res, { success: true, jobs });
      }

      default:
        return badRequest(
          res,
          `Unknown action '${action}'. Valid actions: run-job, run-next, retry-job, list-jobs, get-job`
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[/api/provisioning:${action}] Error:`, message);
    return json(res, { success: false, error: message }, 500);
  }
}
