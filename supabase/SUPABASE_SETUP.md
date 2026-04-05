# ClawPH — Supabase Setup Guide

## What This Does

Every checkout request submitted through ClawPH is persisted to Supabase as the source of truth:

- **profiles** — Google-authenticated users (keyed by Google `sub`)
- **workspaces** — one per customer, with membership linked to profile
- **subscription_intents** — one per checkout request (append-only audit trail)
- **provisioning_jobs** — one per checkout in `pending` state, ready for manual/automated fulfillment

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `clawph` (or your preference)
3. Pick a region closest to your users (Philippines → ` Southeast Asia: Singapore`)
4. Save the **Database Password** shown — you'll need it

## Step 2: Get Your API Credentials

In Supabase Dashboard → **Settings** → **API**, copy:

| Variable | Where to find it |
|----------|-----------------|
| `SUPABASE_URL` | "Project URL" field |
| `SUPABASE_SERVICE_KEY` | "service_role" secret (NOT `anon` public key) |

## Step 3: Run the Schema

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**
4. Verify tables were created: check **Table Editor** in the left sidebar

### What the Schema Creates

| Table | Purpose |
|-------|---------|
| `profiles` | One per Google user (upserted on checkout) |
| `workspaces` | One per customer account |
| `workspace_memberships` | Links profiles to workspaces |
| `subscription_intents` | Append-only checkout request log |
| `provisioning_jobs` | Pending install jobs, status transitions over time |
| `payment_events` | (optional, easy to add later) |

### RLS Policies

Row Level Security is **enabled** on all tables. The schema sets permissive starter policies:

- `profiles`: users can read/write only their own row (keyed by Google `sub` in JWT)
- `subscription_intents`: open for insert (checkout endpoint is public), read gated by profile membership
- `provisioning_jobs`: read for workspace members, write for service role only

> **Important**: These are starter policies. For production, review and tighten them based on your auth flow.

## Step 4: Add Environment Variables

Add to your deployment environment (Vercel → Project Settings → Environment Variables):

```env
SUPABASE_URL=https://xyzabc.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role key
```

For local development, add to `.env.local` or however you manage local env vars.

## Step 5: Verify It Works

After a checkout, check in Supabase **Table Editor**:
- `subscription_intents` should have a new row
- `profiles` should have the user's Google info
- `workspaces` should have a new workspace
- `provisioning_jobs` should have a row in `pending` state

## Graceful Degradation

If `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` is **not** set:
- Checkout still works (email notification is sent/console logged)
- No error is thrown — the request succeeds but no DB record is created
- `persisted: false` is returned in the API response so the frontend knows

## Provisioning Job Workflow

The `provisioning_jobs.status` field transitions:

```
pending → not_started → in_progress → completed
                                  ↘ failed
```

Transition with `updateProvisioningJobStatus()` from `src/lib/db-persistence.ts`.

Current state: **manual**. Each pending job in the `pending` state requires ops to:
1. Confirm payment
2. Manually trigger agent provisioning
3. Update status to `completed` or `failed`

## Switching Payment Provider

When you're ready to connect PayMongo or Xendit:

1. Add provider API keys
2. In `api/payments/checkout.ts`, after successful provider charge → call `updateProvisioningJobStatus(jobId, 'in_progress')`
3. On completion → `updateProvisioningJobStatus(jobId, 'completed')`
4. On failure → `updateProvisioningJobStatus(jobId, 'failed', { errorMessage: '...' })`

The `subscription_intent.status` field can also be updated: `pending → confirmed → fulfilled`

## Viewing Data

- **Supabase Dashboard** → Table Editor (GUI)
- **Supabase** → SQL Editor → run `SELECT * FROM subscription_intents ORDER BY created_at DESC LIMIT 20;`

## Security Notes

- `SUPABASE_SERVICE_KEY` must **never** be exposed to the browser — it's only used server-side in Vercel functions
- The `sub` claim from the Google JWT is used as the stable identity key — this is the Google user ID, not the email
- If you switch auth providers later, the `google_sub` column can be renamed to a more generic `provider_id`
