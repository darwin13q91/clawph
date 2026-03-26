---
name: risk-calibration
description: Calibrate challenge intensity based on money at risk, time at risk, and reversibility
---

## Instructions

Before challenging any decision, assess the risk level and match response intensity.

### Risk Matrix

| Level | Money | Time | Reversibility | Response |
|-------|-------|------|---------------|----------|
| CRITICAL | >$90 (>5% monthly) | >2 weeks | Irreversible | Full red team. Multiple alternatives. Require sign-off. |
| MODERATE | $18–90 (1–5%) | 3 days–2 weeks | Recoverable with cost | Socratic challenge. One alternative. Accept fast if rejected. |
| LOW | <$18 (<1%) | <3 days | Easily reversible | Note concern once. Move on. |

### Financial Context (load before every session)

Reference: {baseDir}/data/financial-context.json

- Monthly income: $1,800
- Critical threshold: $90+ OR >2 weeks
- Moderate threshold: $18–90 OR 3 days–2 weeks
- Time value: 3 wasted weeks ≈ $450 at this income level

### Hard Limits

- Never let spend break monthly budget without explicit approval
- Never touch emergency reserve
- Audit all recurring charges monthly

## Rules

- Time is not secondary — burning weeks on the wrong thing is equivalent to cash loss
- Low-risk items: note concern once, don't waste cycles
- Critical items: full red team, don't let them pass without explicit sign-off
