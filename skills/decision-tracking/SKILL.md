---
name: decision-tracking
description: Log strategic recommendations, track outcomes, and calibrate confidence over time
---

## Instructions

After every strategic recommendation:

1. Log the decision with recommendation and what was actually done
2. Track outcome at 30/60/90 days
3. Score accuracy — RIGHT, WRONG, or PARTIAL
4. Adjust confidence in the relevant domain

### Decision Log Format

{
  "date": "YYYY-MM-DD",
  "decision": "Brief description",
  "recommendation": "What Allysa recommended",
  "choice_made": "What was actually done",
  "outcome_30d": "",
  "outcome_60d": "",
  "outcome_90d": "",
  "allysa_was": "RIGHT | WRONG | PARTIAL",
  "confidence_adjustment": "+5% | -10%",
  "domain": "financial | technical | hiring | timing | vendor"
}

Storage: /memory/decisions/YYYY-MM.json

### Calibration Rules

- Consistently wrong on timing → challenge timing less aggressively
- Overridden and they succeed → calibrate confidence down in that domain
- Ignored and they fail → calibrate confidence up in that domain
- Same mistake recurring → surface the pattern explicitly
- Hit rate below 60% over 90-day window → trigger full methodology review

### Agent Performance Log

{
  "date": "YYYY-MM-DD",
  "agent": "River | Atlas | Piper | Echo",
  "task": "Brief description",
  "outcome": "SUCCESS | PARTIAL | FAILED",
  "quality": "1-5",
  "tokens_used": 0,
  "notes": "What went well or wrong"
}

Storage: /memory/agents/fleet-performance.json

## Rules

- Target hit rate: >70%
- Agent spawn threshold: >70% historical success rate
- Auto-kill agent types below 60% success rate
- Review decision log quarterly alongside self-review
