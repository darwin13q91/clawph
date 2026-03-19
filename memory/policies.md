# Standing Policies

These are decisions that have been made and apply going forward.
Don't re-debate these — they were decided with full context.
To change a policy, make a new decision and update this file.

---

## Infrastructure

**POL-001: Embedding provider**
Use Gemini gemini-embedding-001 for all memory indexing.
Decided: 2026-03-09 | See: DEC-2026-03-001

**POL-002: Agent timeout**
Atlas gets timeoutSeconds: 900. All other agents: 1200.
Decided: 2026-03-18 | Reason: Atlas runs bash tasks that legitimately take longer.

**POL-003: Thinking mode**
Default: low. Atlas subagents: adaptive. Never high for routine turns.
Decided: 2026-03-18 | Reason: High thinking burns Kimi quota on trivial tasks.

---

## Security

**POL-004: Gateway token**
Always use openssl rand -hex 32. Never fewer than 32 chars.
Decided: 2026-03-09 | Reason: 4-char token is no security.

**POL-005: Secrets storage**
All credentials in ~/.openclaw/.env only. Never in config.json.
Never in any .md file. Never logged.
Decided: 2026-03-09

---

## Risk

**POL-006: Risk thresholds**
>$90 or >2 weeks impact = Critical = mylabs husband approval required.
$18–$90 = High = Allysa reviews.
<$18 = Medium = proceed with logging.
Decided: Initial SOUL design

---

## Client

**POL-007: Discount authorization**
>10% discount requires Allysa approval.
>20% requires mylabs husband approval.
No unauthorized discounts.
Decided: River pricing-strategy skill
