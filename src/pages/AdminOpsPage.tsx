import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const FILTERS = ['all', 'intents', 'jobs', 'events', 'provisioning'] as const;
type Filter = (typeof FILTERS)[number];

type IntentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'fulfilled';
type JobStatus = 'pending' | 'not_started' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'manual_action_required';

interface SubscriptionIntentRow {
  id: string;
  status: IntentStatus;
  plan_name: string | null;
  billing_label: string | null;
  currency: string;
  amount_local: number | null;
  amount_usd: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_company: string | null;
  customer_country: string | null;
  checkout_request_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProvisioningJobRow {
  id: string;
  status: JobStatus;
  plan_id: string | null;
  agent_session_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  provisioning_data: Record<string, unknown> | null;
  subscription_intent: {
    checkout_request_id: string | null;
    customer_email: string | null;
    plan_name: string | null;
  } | null;
  workspace: {
    name: string | null;
    slug: string | null;
  } | null;
}

interface PaymentEventRow {
  id: string;
  event_type: string;
  provider: string | null;
  provider_event_id: string | null;
  amount: number | null;
  currency: string | null;
  created_at: string;
  subscription_intent: {
    checkout_request_id: string | null;
    customer_email: string | null;
  } | null;
  provisioning_job: {
    status: string | null;
  } | null;
}

interface ProvisioningRunRow {
  id: string;
  jobId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  steps: Array<{
    id: string;
    label: string;
    status: string;
    error?: string;
    manualActionRequired?: boolean;
    completedAt?: string;
  }>;
  logs?: string[];
}

interface OperationsPayload {
  intents?: SubscriptionIntentRow[];
  jobs?: ProvisioningJobRow[];
  events?: PaymentEventRow[];
  provisioningRuns?: ProvisioningRunRow[];
}

export default function AdminOpsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [intents, setIntents] = useState<SubscriptionIntentRow[]>([]);
  const [jobs, setJobs] = useState<ProvisioningJobRow[]>([]);
  const [events, setEvents] = useState<PaymentEventRow[]>([]);
  const [provisioningActionLoading, setProvisioningActionLoading] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const params = useMemo(() => {
    const q = new URLSearchParams();
    if (filter !== 'all') q.set('type', filter);
    return q.toString();
  }, [filter]);

  useEffect(() => {
    void fetchOperations();
  }, [params]);

  const fetchOperations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/operations${params ? `?${params}` : ''}`, {
        credentials: 'include',
      });
      const data = (await response.json()) as {
        success: boolean;
        data?: OperationsPayload;
        error?: string;
      };

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || `Failed to load operations (${response.status})`);
      }

      setIntents(data.data.intents ?? []);
      setJobs(data.data.jobs ?? []);
      setEvents(data.data.events ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load operational data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const actionRequest = async (path: string, payload: Record<string, unknown>) => {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { success: boolean; error?: string };
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
  };

  const confirmIntent = async (intentId: string, status: IntentStatus) => {
    try {
      await actionRequest('/api/operations?action=confirm-intent', { intentId, status });
      toast.success(`Intent updated to ${status}`);
      setRefreshing(true);
      await fetchOperations();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update subscription intent');
    }
  };

  const updateJob = async (jobId: string, status: JobStatus) => {
    try {
      await actionRequest('/api/operations?action=update-job', { jobId, status });
      toast.success(`Job updated to ${status}`);
      setRefreshing(true);
      await fetchOperations();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update provisioning job');
    }
  };

  const runProvisioningJob = async (jobId: string) => {
    setProvisioningActionLoading(jobId);
    try {
      const secret = (window as unknown as Record<string, string | undefined>).__ADMIN_SECRET__;
      const response = await fetch('/api/provisioning?action=run-job', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret ?? '' },
        body: JSON.stringify({ jobId }),
      });
      const data = (await response.json()) as { success: boolean; run?: ProvisioningRunRow; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Provisioning run failed');
      toast.success(`Provisioning run complete: ${data.run?.status ?? 'unknown'}`);
      setRefreshing(true);
      await fetchOperations();
    } catch (error) {
      console.error(error);
      toast.error(`Provisioning failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProvisioningActionLoading(null);
    }
  };

  const runNextProvisioningJob = async () => {
    setProvisioningActionLoading('__next__');
    try {
      const secret = (window as unknown as Record<string, string | undefined>).__ADMIN_SECRET__;
      const response = await fetch('/api/provisioning?action=run-next', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret ?? '' },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as { success: boolean; run?: ProvisioningRunRow; message?: string; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? 'No next job or run failed');
      if (!data.run) {
        toast.info('No pending jobs found');
      } else {
        toast.success(`Ran job ${data.run.jobId}: ${data.run.status}`);
      }
      setRefreshing(true);
      await fetchOperations();
    } catch (error) {
      console.error(error);
      toast.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProvisioningActionLoading(null);
    }
  };

  const retryProvisioningJob = async (jobId: string) => {
    setProvisioningActionLoading(jobId);
    try {
      const secret = (window as unknown as Record<string, string | undefined>).__ADMIN_SECRET__;
      const response = await fetch('/api/provisioning?action=retry-job', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': secret ?? '' },
        body: JSON.stringify({ jobId }),
      });
      const data = (await response.json()) as { success: boolean; run?: ProvisioningRunRow; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Retry failed');
      toast.success(`Retried job ${jobId}: ${data.run?.status ?? 'unknown'}`);
      setRefreshing(true);
      await fetchOperations();
    } catch (error) {
      console.error(error);
      toast.error(`Retry failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProvisioningActionLoading(null);
    }
  };

  const badgeClass = (status: string) => {
    if (status === 'completed' || status === 'fulfilled' || status === 'manual_action_required') return 'bg-emerald-100 text-emerald-700';
    if (status === 'confirmed' || status === 'in_progress' || status === 'running') return 'bg-sky-100 text-sky-700';
    if (status === 'pending' || status === 'not_started') return 'bg-amber-100 text-amber-700';
    if (status === 'failed' || status === 'cancelled' || status === 'error') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

  const stepBadgeClass = (status: string) => {
    if (status === 'completed') return 'bg-emerald-900/40 text-emerald-300 border border-emerald-700';
    if (status === 'running') return 'bg-sky-900/40 text-sky-300 border border-sky-700';
    if (status === 'skipped') return 'bg-slate-800 text-slate-400 border border-slate-600';
    if (status === 'failed') return 'bg-rose-900/40 text-rose-300 border border-rose-700';
    return 'bg-slate-800 text-slate-400 border border-slate-600';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">ClawPH Ops</p>
            <h1 className="mt-2 text-3xl font-semibold">Payments + provisioning control panel</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              This view is for authenticated ops use. It shows payment intent state, webhook events, and
              provisioning progress so manual follow-up stays coherent while provider integrations are still maturing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300" htmlFor="filter-select">
              View
            </label>
            <select
              id="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {FILTERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                await fetchOperations();
              }}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">
            Loading operational data…
          </div>
        ) : (
          <div className="space-y-8">
            {(filter === 'all' || filter === 'intents') && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Subscription intents</h2>
                    <p className="text-sm text-slate-400">Checkout requests and their payment lifecycle status.</p>
                  </div>
                  <span className="text-sm text-slate-400">{intents.length} rows</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="py-3 pr-4">Reference</th>
                        <th className="py-3 pr-4">Customer</th>
                        <th className="py-3 pr-4">Plan</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">Amount</th>
                        <th className="py-3 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intents.map((intent) => (
                        <tr key={intent.id} className="border-b border-slate-800/70 align-top">
                          <td className="py-3 pr-4 font-mono text-xs text-slate-300">{intent.checkout_request_id ?? intent.id}</td>
                          <td className="py-3 pr-4">
                            <div className="font-medium text-slate-100">{intent.customer_name ?? '—'}</div>
                            <div className="text-slate-400">{intent.customer_email ?? '—'}</div>
                          </td>
                          <td className="py-3 pr-4 text-slate-300">
                            <div>{intent.plan_name ?? intent.billing_label ?? '—'}</div>
                            <div className="text-xs text-slate-500">{intent.customer_company ?? intent.customer_country ?? ''}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(intent.status)}`}>
                              {intent.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-300">
                            {intent.currency === 'PHP'
                              ? `₱${Number(intent.amount_local ?? 0).toLocaleString()}`
                              : `$${Number(intent.amount_usd ?? 0).toFixed(2)}`}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-2">
                              {intent.status === 'pending' && (
                                <>
                                  <button className="rounded-md border border-emerald-600 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-600/10" onClick={() => confirmIntent(intent.id, 'confirmed')} type="button">Confirm</button>
                                  <button className="rounded-md border border-rose-600 px-3 py-1 text-xs text-rose-300 hover:bg-rose-600/10" onClick={() => confirmIntent(intent.id, 'failed')} type="button">Fail</button>
                                  <button className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700" onClick={() => confirmIntent(intent.id, 'cancelled')} type="button">Cancel</button>
                                </>
                              )}
                              {intent.status === 'confirmed' && (
                                <button className="rounded-md border border-sky-600 px-3 py-1 text-xs text-sky-300 hover:bg-sky-600/10" onClick={() => confirmIntent(intent.id, 'fulfilled')} type="button">Mark fulfilled</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {(filter === 'all' || filter === 'jobs') && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Provisioning jobs</h2>
                    <p className="text-sm text-slate-400">Manual progression view for the provisioning runner skeleton.</p>
                  </div>
                  <span className="text-sm text-slate-400">{jobs.length} rows</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="py-3 pr-4">Reference</th>
                        <th className="py-3 pr-4">Workspace</th>
                        <th className="py-3 pr-4">Plan</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">Started</th>
                        <th className="py-3 pr-4">Completed</th>
                        <th className="py-3 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id} className="border-b border-slate-800/70 align-top">
                          <td className="py-3 pr-4 font-mono text-xs text-slate-300">{job.subscription_intent?.checkout_request_id ?? job.id}</td>
                          <td className="py-3 pr-4 text-slate-300">{job.workspace?.name ?? job.workspace?.slug ?? '—'}</td>
                          <td className="py-3 pr-4 text-slate-300">{job.plan_id ?? job.subscription_intent?.plan_name ?? '—'}</td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(job.status)}`}>
                              {job.status}
                            </span>
                            {job.error_message ? <div className="mt-2 max-w-md text-xs text-rose-300">{job.error_message}</div> : null}
                          </td>
                          <td className="py-3 pr-4 text-slate-300">{job.started_at ? new Date(job.started_at).toLocaleString() : '—'}</td>
                          <td className="py-3 pr-4 text-slate-300">{job.completed_at ? new Date(job.completed_at).toLocaleString() : '—'}</td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-2">
                              {job.status === 'pending' && (
                                <>
                                  <button className="rounded-md border border-amber-600 px-3 py-1 text-xs text-amber-300 hover:bg-amber-600/10" onClick={() => updateJob(job.id, 'not_started')} type="button">Not started</button>
                                  <button className="rounded-md border border-sky-600 px-3 py-1 text-xs text-sky-300 hover:bg-sky-600/10" onClick={() => updateJob(job.id, 'in_progress')} type="button">Start</button>
                                </>
                              )}
                              {job.status === 'not_started' && (
                                <>
                                  <button className="rounded-md border border-sky-600 px-3 py-1 text-xs text-sky-300 hover:bg-sky-600/10" onClick={() => updateJob(job.id, 'in_progress')} type="button">Start</button>
                                  <button className="rounded-md border border-rose-600 px-3 py-1 text-xs text-rose-300 hover:bg-rose-600/10" onClick={() => updateJob(job.id, 'cancelled')} type="button">Cancel</button>
                                </>
                              )}
                              {job.status === 'in_progress' && (
                                <>
                                  <button className="rounded-md border border-emerald-600 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-600/10" onClick={() => updateJob(job.id, 'completed')} type="button">Complete</button>
                                  <button className="rounded-md border border-rose-600 px-3 py-1 text-xs text-rose-300 hover:bg-rose-600/10" onClick={() => updateJob(job.id, 'failed')} type="button">Fail</button>
                                  <button className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700" onClick={() => updateJob(job.id, 'cancelled')} type="button">Cancel</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {(filter === 'all' || filter === 'events') && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Payment events</h2>
                    <p className="text-sm text-slate-400">Append-only audit trail from webhook/provider/admin actions.</p>
                  </div>
                  <span className="text-sm text-slate-400">{events.length} rows</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="py-3 pr-4">Time</th>
                        <th className="py-3 pr-4">Reference</th>
                        <th className="py-3 pr-4">Type</th>
                        <th className="py-3 pr-4">Provider</th>
                        <th className="py-3 pr-4">Amount</th>
                        <th className="py-3 pr-4">Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id} className="border-b border-slate-800/70 align-top">
                          <td className="py-3 pr-4 text-slate-300">{new Date(event.created_at).toLocaleString()}</td>
                          <td className="py-3 pr-4 font-mono text-xs text-slate-300">{event.subscription_intent?.checkout_request_id ?? event.provisioning_job?.status ?? event.id}</td>
                          <td className="py-3 pr-4 text-slate-300">{event.event_type}</td>
                          <td className="py-3 pr-4 text-slate-300">{event.provider ?? '—'}</td>
                          <td className="py-3 pr-4 text-slate-300">{event.amount !== null ? `${event.currency === 'PHP' ? '₱' : '$'}${Number(event.amount).toLocaleString()}` : '—'}</td>
                          <td className="py-3 pr-4 text-slate-400">{event.provider_event_id ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {(filter === 'all' || filter === 'provisioning') && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Provisioning Runner</h2>
                    <p className="text-sm text-slate-400">
                      Execute the real provisioning workflow for confirmed subscriptions.
                      Jobs in final states are left unchanged. Unconfigured hook → manual_action_required.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setProvisioningActionLoading('__refresh__');
                        await runNextProvisioningJob();
                        setProvisioningActionLoading(null);
                      }}
                      className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                      disabled={provisioningActionLoading !== null}
                    >
                      {provisioningActionLoading === '__refresh__' ? 'Finding next job…' : '▶ Run next pending job'}
                    </button>
                  </div>
                </div>

                {/* Status legend */}
                <div className="mb-4 flex flex-wrap gap-3 text-xs">
                  {[
                    ['pending/not_started', 'Awaiting provisioning'],
                    ['in_progress', 'Runner active'],
                    ['completed', 'Successfully provisioned'],
                    ['failed', 'Provisioning failed'],
                    ['manual_action_required', 'External hook not configured — needs ops follow-up'],
                    ['cancelled', 'Cancelled by operator'],
                  ].map(([status, desc]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(status)}`}>{status}</span>
                      <span className="text-slate-500">{desc}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {jobs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400">No provisioning jobs found.</p>
                  ) : (
                    jobs.map((job) => {
                      const pd = job.provisioning_data as {
                        steps?: Array<{
                          id: string;
                          label: string;
                          status: string;
                          error?: string;
                          manualActionRequired?: boolean;
                          completedAt?: string;
                        }>;
                        logs?: string[];
                        bundle?: { slug?: string; name?: string };
                        runId?: string;
                        finalizedAt?: string;
                        externalHookConfigured?: boolean;
                      } | null;
                      const isExpanded = expandedJobId === job.id;
                      const isLoading = provisioningActionLoading === job.id;

                      return (
                        <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(job.status)}`}>
                                  {job.status}
                                </span>
                                <span className="font-mono text-xs text-slate-400 truncate">
                                  {job.subscription_intent?.customer_email ?? job.id}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {job.subscription_intent?.plan_name ?? job.plan_id ?? ''}
                                </span>
                                {pd?.bundle?.slug && (
                                  <span className="text-xs text-emerald-400">slug: {pd.bundle.slug}</span>
                                )}
                              </div>
                              {job.error_message && (
                                <p className="mt-1.5 text-xs text-rose-300">Error: {job.error_message}</p>
                              )}
                              {job.status === 'manual_action_required' && (
                                <p className="mt-1.5 text-xs text-amber-300">
                                  ⚠ External provisioning hook not configured — operator must complete manually
                                </p>
                              )}
                            </div>
                            <div className="flex flex-shrink-0 flex-wrap gap-2">
                              {['pending', 'not_started'].includes(job.status) && (
                                <button
                                  type="button"
                                  onClick={() => void runProvisioningJob(job.id)}
                                  disabled={isLoading}
                                  className="rounded-md border border-sky-600 px-3 py-1 text-xs text-sky-300 hover:bg-sky-600/10 disabled:opacity-60"
                                >
                                  {isLoading ? 'Running…' : '▶ Run now'}
                                </button>
                              )}
                              {['failed'].includes(job.status) && (
                                <button
                                  type="button"
                                  onClick={() => void retryProvisioningJob(job.id)}
                                  disabled={isLoading}
                                  className="rounded-md border border-amber-600 px-3 py-1 text-xs text-amber-300 hover:bg-amber-600/10 disabled:opacity-60"
                                >
                                  {isLoading ? 'Retrying…' : '↺ Retry'}
                                </button>
                              )}
                              {['completed', 'failed', 'manual_action_required', 'cancelled'].includes(job.status) && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                                  className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
                                >
                                  {isExpanded ? '▲ Less' : '▼ Details'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded detail panel */}
                          {isExpanded && pd && (
                            <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                              {/* Steps */}
                              {pd.steps && pd.steps.length > 0 && (
                                <div>
                                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Provisioning Steps</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {pd.steps.map((step) => (
                                      <div
                                        key={step.id}
                                        className={`rounded-md px-3 py-1.5 text-xs ${stepBadgeClass(step.status)}`}
                                      >
                                        <span className="font-medium">{step.label}</span>
                                        <span className="ml-1.5 opacity-70">({step.status})</span>
                                        {step.manualActionRequired && (
                                          <span className="ml-1.5 text-amber-300">⚠ manual</span>
                                        )}
                                        {step.error && (
                                          <span className="ml-1.5 text-rose-300">— {step.error.slice(0, 80)}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Artifact bundle summary */}
                              {pd.bundle && (
                                <div>
                                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Artifact Bundle</h4>
                                  <div className="rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                                    <pre className="whitespace-pre-wrap break-all">
                                      {JSON.stringify(pd.bundle, null, 2).slice(0, 600)}
                                      {JSON.stringify(pd.bundle).length > 600 ? '…' : ''}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Logs */}
                              {pd.logs && pd.logs.length > 0 && (
                                <div>
                                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Run Logs ({pd.logs.length} entries)
                                  </h4>
                                  <div className="rounded-md border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                                    <pre className="whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                      {pd.logs.join('\n')}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* External hook info */}
                              {pd.externalHookConfigured !== undefined && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pd.externalHookConfigured ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-amber-900/40 text-amber-300 border border-amber-700'}`}>
                                    External hook: {pd.externalHookConfigured ? 'configured' : 'NOT configured'}
                                  </span>
                                  {pd.finalizedAt && (
                                    <span className="text-slate-500">Finalized: {new Date(pd.finalizedAt).toLocaleString()}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Run instructions */}
                <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/30 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-200">⚙ Operator Guide — External Provisioning Hook</h4>
                  <div className="space-y-1 text-xs text-slate-400 font-mono">
                    <p>Set one of these env vars on the server to enable fully automated provisioning:</p>
                    <p className="text-emerald-400">PROVISIONING_COMMAND_TEMPLATE</p>
                    <p className="pl-4 text-slate-300">
                      Shell command string with placeholders: &quot;&#123;&#123;JOB_ID&#125;&#125;, &#123;&#123;WORKSPACE_ID&#125;&#125;, &#123;&#123;PLAN_ID&#125;&#125;, &#123;&#123;SLUG&#125;&#125;, &#123;&#123;CUSTOMER_EMAIL&#125;&#125;
                    </p>
                    <p className="mt-2 text-emerald-400">PROVISIONING_SCRIPT_PATH</p>
                    <p className="pl-4 text-slate-300">
                      Absolute path to a shell script. Receives env vars: CLAWPH_JOB_ID, CLAWPH_WORKSPACE_ID,
                      CLAWPH_PLAN_ID, CLAWPH_SLUG, CLAWPH_CUSTOMER_EMAIL, CLAWPH_RUN_ID
                    </p>
                    <p className="mt-2 text-emerald-400">PROVISIONING_TIMEOUT_SECONDS</p>
                    <p className="pl-4 text-slate-300">Timeout for the external command (default: 120s)</p>
                    <p className="mt-3 text-amber-300">
                      Without these env vars, jobs will be marked manual_action_required after artifact bundle creation.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
