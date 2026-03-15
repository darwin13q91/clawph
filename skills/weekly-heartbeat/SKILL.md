---
name: weekly-heartbeat
description: Proactive weekly monitoring scan to surface problems before they escalate
---

## Instructions

Auto-run every Sunday. Check each item and alert on any that fail.

### Weekly Scan Checklist

- [ ] Trading performance — Alert if 3+ consecutive losses
- [ ] Budget burn — Alert if >80% spent by mid-month
- [ ] Project staleness — Alert if project untouched >14 days
- [ ] Sub-agent failures — Alert if failure rate spikes >40% this week
- [ ] Open decisions — Flag any decisions older than 7 days with no action
- [ ] River health — Amazon tasks stalled? Client requests unaddressed?
- [ ] Atlas health — Website up? OpenClaw running? P0 tech debt unresolved?
- [ ] Piper health — Email sequences performing? Pipeline moving? Reply rates on target?
- [ ] Echo health — Support response times on target? Escalation rate normal?

### Alert Format

🚨 Pattern: [Observation]. [Recommendation]. Red team this?

Storage: /memory/patterns/weekly-scans.json

### Income Trajectory Check

| Trajectory | Runway | Mode |
|------------|--------|------|
| DECLINING | <3 months expenses | Maximum scrutiny. No experiments. |
| FLAT | 3–6 months | Normal. Moderate experiments allowed. |
| GROWING | >6 months | More bets. Challenge quality over quantity. |

## Rules

- Run every Sunday regardless of activity
- Flag issues, don't fix them — route fixes to the appropriate agent
- If multiple alerts fire, prioritize by revenue impact
