# ClawPH Provisioning Runner — Operator Guide

## What It Does

The provisioning runner takes a confirmed `provisioning_job` record from the Supabase database and executes a real multi-step workflow that sets up the customer's workspace environment.

The full tenant setup pipeline has **two stages**:

1. **Provision stage** (`provision-customer.sh` or `provision-and-bootstrap.sh`) — creates the artifact bundle with manifest and config templates
2. **Bootstrap stage** (`bootstrap-tenant.sh`) — creates the real tenant runtime directory from the artifact bundle

Use `provision-and-bootstrap.sh` to run both stages in one command.

## Job Status State Machine

```
pending
  └── not_started   ← manually queued or intent confirmed
        └── in_progress   ← runner picks it up
              ├── completed              ← external hook succeeded
              ├── manual_action_required ← external hook NOT configured
              └── failed                ← step threw an error
                    └── (can retry → not_started)
```

**All statuses:** `pending` | `not_started` | `in_progress` | `completed` | `failed` | `cancelled` | `manual_action_required`

**Final statuses** (runner skips re-execution): `completed` | `failed` | `cancelled` | `manual_action_required`

## Provisioning Steps (in order)

| Step ID | Label | What it does |
|---|---|---|
| `validate_prerequisites` | Validate prerequisites | Loads job + subscription intent, checks status is compatible |
| `generate_slug` | Generate workspace slug | Derives a unique slug from email/company, updates workspace record |
| `create_artifact_bundle` | Create artifact bundle | Writes manifest, secrets placeholders, setup instructions to DB |
| `invoke_external_hook` | Invoke external hook | Runs `PROVISIONING_COMMAND_TEMPLATE` or `PROVISIONING_SCRIPT_PATH` if set |
| `finalize` | Finalize record | Writes final status, full run log + steps to `provisioning_data` JSON field |

## External Provisioning Hook

The runner supports invoking an external script to perform the actual tenant deployment. This is implemented by the `provision-and-bootstrap.sh` script (recommended) or `provision-customer.sh` + `bootstrap-tenant.sh` separately in the `scripts/` directory.

### Quick Start (Self-Hosted)

```bash
# 1. Place the scripts in a stable location
sudo cp scripts/provision-and-bootstrap.sh /opt/clawph/scripts/
sudo cp scripts/bootstrap-tenant.sh /opt/clawph/scripts/
sudo cp scripts/provision-customer.sh /opt/clawph/scripts/
sudo chmod +x /opt/clawph/scripts/*.sh

# 2. Create tenant base directory
sudo mkdir -p /var/opt/clawph/tenants
sudo chown $USER /var/opt/clawph/tenants

# 3. Set environment variables
# In your .env or systemd service file:
export PROVISIONING_SCRIPT_PATH=/opt/clawph/scripts/provision-and-bootstrap.sh
export PROVISIONING_TIMEOUT_SECONDS=300
export TENANT_BASE_DIR=/var/opt/clawph/tenants
export CLAWPH_ARTIFACT_BASE_DIR=/var/opt/clawph/tenants
export CLAWPH_PROVISION_LOG=/var/log/clawph/provision.log

# 4. (Optional) Set template values for config rendering
export OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
export LLM_PROVIDER=openai
export LLM_MODEL=gpt-4o-mini

# 5. Run the next pending job
node scripts/run-provisioning.js --next
```

### What the Full Pipeline Does (provision-and-bootstrap.sh)

The pipeline chains `provision-customer.sh` → `bootstrap-tenant.sh`:

**Stage 1 — provision-customer.sh:**
1. **Validates** required inputs (job ID, slug, etc.)
2. **Creates** a customer artifact directory: `/var/opt/clawph/tenants/<slug>/`
3. **Writes** a deployment-ready handoff bundle (manifest + config templates)

**Stage 2 — bootstrap-tenant.sh:**
1. **Reads** the artifact `manifest.json` from stage 1
2. **Renders** config templates with actual env values (or leaves placeholders if not set)
3. **Creates** the full tenant runtime directory structure:
   - `config/` — rendered environment and agent config files
   - `data/` — tenant data (initially empty)
   - `logs/` — tenant logs
   - `runtime/` — runtime working directory
   - `onboarding/` — onboarding documentation
   - `secrets/` — secrets directory (empty)
4. **Generates** `tenant-status.json` with honest status (`bootstrapped`)
5. **Generates** `onboarding/README.md` with operator instructions
6. **Optionally** invokes a downstream deployment hook

### What the Pipeline Does NOT Do

- Does NOT create a live OpenClaw instance (requires OpenClaw runtime + operator action)
- Does NOT register the tenant in a multi-tenant control plane
- Does NOT issue real credentials (uses `{{PLACEHOLDER}}` tokens if env vars not set)

The operator must follow the checklist in `onboarding/README.md` to complete the actual deployment.

### Environment Variables for the External Hook

```bash
# Required: path to the provisioning pipeline script
PROVISIONING_SCRIPT_PATH="/opt/clawph/scripts/provision-and-bootstrap.sh"

# Optional: template-based command (alternative to PROVISIONING_SCRIPT_PATH)
# Placeholders: {{JOB_ID}} {{WORKSPACE_ID}} {{PLAN_ID}} {{SLUG}} {{CUSTOMER_EMAIL}}
PROVISIONING_COMMAND_TEMPLATE="/opt/clawph/scripts/provision-and-bootstrap.sh"

# Optional: timeout for external command (default: 120s, recommend 300 for pipeline)
PROVISIONING_TIMEOUT_SECONDS=300

# Optional: base directory for customer artifacts (default: /var/opt/clawph/tenants)
CLAWPH_ARTIFACT_BASE_DIR="/var/opt/clawph/tenants"

# Optional: base directory for tenant runtime environments
TENANT_BASE_DIR="/var/opt/clawph/tenants"

# Optional: log file paths
CLAWPH_PROVISION_LOG="/var/log/clawph/provision.log"
CLAWPH_BOOTSTRAP_LOG="/var/log/clawph/bootstrap.log"

# Optional: operator label for audit trail (default: provisioning-runner)
CLAWPH_OPERATOR="systemd-timer"

# Optional: downstream deployment hook invoked after bootstrap
TENANT_DEPLOY_HOOK="/opt/clawph/scripts/deploy-tenant.sh"

# Template rendering variables (passed to bootstrap-tenant.sh):
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
TELEGRAM_BOT_TOKEN={{TELEGRAM_BOT_TOKEN}}
PHILGEPS_MONITOR_ENABLED=true
PHILSCOUT_ENABLED=true
BIR_MONITOR_ENABLED=false
```

### Variables Passed to the External Script

The external script receives these environment variables from the runner:

| Variable | Description | Example |
|---|---|---|
| `CLAWPH_JOB_ID` | Provisioning job UUID | `abc123-...` |
| `CLAWPH_WORKSPACE_ID` | Workspace UUID | `ws-xyz-...` |
| `CLAWPH_PLAN_ID` | Plan identifier | `openclaw-growth` |
| `CLAWPH_SLUG` | Workspace slug | `acme-corp-x7k2` |
| `CLAWPH_CUSTOMER_EMAIL` | Customer email | `ops@acme.com` |
| `CLAWPH_RUN_ID` | Provisioning run UUID | `run-uvw-...` |

### Marking a Job as Complete

After manually deploying the customer's OpenClaw workspace, use the completion helper:

```bash
# Mark as completed:
./scripts/complete-provisioning.sh <job-id> <supabase-url> <service-key>

# Or with environment variables:
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-key
./scripts/complete-provisioning.sh <job-id>

# Mark as failed:
./scripts/complete-provisioning.sh <job-id> --status failed
```

## Environment Variables

### Required for the API endpoint

```bash
# Admin auth for /api/provisioning endpoint (must match x-admin-key header)
ADMIN_SECRET_KEY=your-secret-here
```

### Required (already in project)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Required for the API endpoint

```bash
# Admin auth for /api/provisioning endpoint (must match x-admin-key header)
ADMIN_SECRET_KEY=your-secret-here
```

### Required (already in project)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## How to Trigger a Run

### Option 1: Admin UI (easiest)

Navigate to `/admin/ops` and select the **provisioning** view. Click **▶ Run next pending job** or **▶ Run now** on individual pending jobs.

### Option 2: API directly

```bash
# Run a specific job
curl -X POST https://your-domain.com/api/provisioning?action=run-job \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_SECRET_KEY" \
  -d '{"jobId": "uuid-here"}'

# Run the next pending job
curl -X POST https://your-domain.com/api/provisioning?action=run-next \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_SECRET_KEY" \
  -d '{}'

# Retry a failed job
curl -X POST https://your-domain.com/api/provisioning?action=retry-job \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_SECRET_KEY" \
  -d '{"jobId": "uuid-here"}'

# List all jobs
curl -X POST https://your-domain.com/api/provisioning?action=list-jobs \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_SECRET_KEY" \
  -d '{}'
```

### Option 3: Programmatic

```typescript
import { runProvisioningJob, fetchNextPendingJob } from './src/lib/provisioning-runner';

// Run a specific job
const run = await runProvisioningJob('job-uuid-here', {
  workspaceId: 'workspace-uuid',
  planId: 'openclaw-growth',
});

// Or find and run the next pending
const next = await fetchNextPendingJob();
if (next) {
  await runProvisioningJob(next.id);
}
```

## Honest Outcomes

The runner **does not fake success**:

| Scenario | Final Status | Meaning |
|---|---|---|
| Pipeline configured + both stages succeeded | `completed` | Tenant directory bootstrapped; operator must deploy |
| Pipeline configured + provision stage failed | `failed` | Error logged; retry with `retry-job` |
| Pipeline configured + bootstrap stage failed | `failed` | Artifact bundle exists; tenant NOT bootstrapped; retry bootstrap |
| Pipeline NOT configured | `manual_action_required` | Artifact bundle NOT created; operator must run manually |
| Any step throws | `failed` | Error message stored; retry clears it |

## Status: `completed` means bootstrapped, NOT deployed

**Important:** When the runner marks a job as `completed`, it means:
- Tenant artifact bundle created ✅
- Tenant runtime directory bootstrapped ✅
- Config templates rendered (may still have placeholders) ✅
- Tenant agent is NOT yet live ⚠️
- Real credentials have NOT been issued ⚠️

The operator must still:
1. Populate secrets in the tenant's `config/workspace.env`
2. Deploy the tenant agent to the OpenClaw environment
3. Mark `tenant-status.json` as `deployed`
4. Confirm the agent is responding

## Artifact Bundle

When `create_artifact_bundle` runs, it writes a structured object to the job's `provisioning_data` field containing:

- `runId`, `jobId`, `workspaceId`, `planId`
- `customer` — email, name, company, plan details
- `manifest` — runner version, environment, notes
- `secretsPlaceholders` — template values to replace with real credentials
- `setupInstructions` — human-readable next steps
- `steps` — log of which provisioning steps ran
- `logs` — full timestamped run log

This is visible in the admin UI when you expand a job's details.

## Manual Follow-Up for `manual_action_required` Jobs

1. Retrieve the job's `provisioning_data` bundle from the admin UI
2. Run the full pipeline manually:
   ```bash
   CLAWPH_JOB_ID=<job-id> CLAWPH_SLUG=<slug> ./provision-and-bootstrap.sh
   ```
3. Follow the checklist in `onboarding/README.md` in the tenant directory
4. After confirming the tenant environment is live, mark the job status to `completed` via the admin UI

## Provisioning CLI

For local development, cron jobs, or CI/CD pipelines, use the CLI:

```bash
# Run a specific job
node scripts/run-provisioning.js <job-id>

# Run the next pending job
node scripts/run-provisioning.js --next

# List all jobs
node scripts/run-provisioning.js --list

# Help
node scripts/run-provisioning.js --help
```

**Required environment variables:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Optional for external hook:**
```bash
PROVISIONING_SCRIPT_PATH=/opt/clawph/scripts/provision-customer.sh
PROVISIONING_TIMEOUT_SECONDS=120
CLAWPH_ARTIFACT_BASE_DIR=/var/opt/clawph/tenants
```

## Honest Limitations

The ClawPH provisioning runner **honestly does not claim to deploy live tenant instances**. Here's the breakdown:

| What the runner does | What it does NOT do |
|---|---|
| Validates job + subscription intent | Create actual OpenClaw workspace |
| Generate unique workspace slug | Register tenant in control plane |
| Create artifact bundle with config templates | Issue real credentials |
| Invoke external hook | Monitor live agent health |
| Update job status in Supabase | Send customer notification |

**The external hook (`provision-customer.sh`) prepares the configuration** — it writes templates, manifests, and checklists. The operator must then:
1. Create the actual OpenClaw workspace/agent
2. Replace placeholders with real credentials
3. Deploy to the customer's environment
4. Mark the job as `completed`

This separation is intentional: the runner handles database state and orchestration, while the external hook handles the actual infrastructure deployment. This allows operators to integrate with any backend (bare metal, VMs, Docker, Kubernetes, etc.) without the runner being coupled to a specific deployment technology.

## Vercel Deployment Note

The runner calls `execSync` (Node.js `child_process`) which **will not work on Vercel serverless** — Vercel prohibits child process execution. Options:

1. **Move runner to a non-serverless environment** (e.g., a Node.js VPS, a long-running EC2/Cloud Run container, or a cron-triggered script on a always-on machine)
2. **Use Vercel Cron** to trigger the `/api/provisioning?action=run-next` endpoint — but note this still requires a non-serverless runner because `execSync` is blocked
3. **Use the runner in a separate process** that runs the provisioning script locally and calls Supabase directly

For the current ClawPH setup (local OpenClaw), the runner can be invoked as a CLI script or triggered via the API endpoint on a non-serverless host.

## File Reference

### Core Provisioning System

| File | Purpose |
|---|---|
| `src/lib/provisioning-runner.ts` | Core runner: step functions, state machine, main `runProvisioningJob()` |
| `src/lib/provisioning-types.ts` | Shared type definitions |
| `api/provisioning.ts` | Vercel API route: `run-job`, `run-next`, `retry-job`, `list-jobs`, `get-job` |
| `src/pages/AdminOpsPage.tsx` | Admin UI with provisioning section |
| `api/operations.ts` | `update-job` action used by admin UI manual status changes |
| `src/lib/db-persistence.ts` | `updateProvisioningJobStatus()` — atomic status transitions |

### External Provisioning Scripts

| File | Purpose |
|---|---|
| `scripts/provision-customer.sh` | Stage 1 external hook — creates customer artifact bundle |
| `scripts/bootstrap-tenant.sh` | Stage 2 bootstrap — creates tenant runtime directory |
| `scripts/provision-and-bootstrap.sh` | **Recommended** — chains both stages in one command |
| `scripts/complete-provisioning.sh` | Marks a job as completed/failed in Supabase |
| `scripts/run-provisioning.js` | CLI for running provisioning jobs programmatically |
| `scripts/README.md` | Detailed documentation for all provisioning scripts |

### External Hook Output

When `provision-and-bootstrap.sh` runs (or both scripts run in sequence), it creates this directory structure under `<TENANT_BASE_DIR>/<slug>/`:

```
<slug>/                           ← Tenant runtime directory (after bootstrap)
├── manifest.json                 # Provisioning manifest (copied from artifact)
├── config/
│   ├── workspace.env             # Rendered environment config (placeholders may remain)
│   ├── workspace.env.tmpl        # Original template (from provision stage)
│   └── agent.json                # Rendered OpenClaw agent config
├── data/                         # Tenant data (initially empty)
├── logs/
│   ├── provision.log             # Provision stage log
│   └── bootstrap.log            # Bootstrap stage log
├── runtime/                      # Runtime working directory
├── onboarding/
│   ├── README.md                # Onboarding instructions (generated by bootstrap)
│   └── operator-notes.md       # Operator checklist (copied from artifact)
├── secrets/                      # Secrets directory (empty — populate before deploy)
└── tenant-status.json           # Tenant status tracker: {"status": "bootstrapped"}
```

The status in `tenant-status.json` tracks the honest state of the tenant:
- `provisioned` — artifact bundle created (before bootstrap)
- `bootstrapped` — tenant runtime directory created (after bootstrap)
- `deployed` — tenant agent is live and responding
