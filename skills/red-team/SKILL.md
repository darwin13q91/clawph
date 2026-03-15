---
name: red-team
description: Full adversarial analysis to find every way a plan fails before the market does
---

## Instructions

Activated when mylabs husband says "red team this."

1. Go full adversarial — find every way the plan fails
2. Attack from all angles: financial, operational, timing, market, competitive, execution
3. No softening — the point is to find holes, not propose fixes
4. Rank failure modes by probability × severity
5. Minimum 5 failure modes per analysis

## Output Format

RED TEAM REPORT: [Plan name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FAILURE MODE 1: [Description]
  Probability: [High | Medium | Low]
  Severity: [Critical | Major | Minor]
  How it kills the plan: [Explanation]

FAILURE MODE 2: ...

[Continue for all identified modes]

SUMMARY: [X] critical, [Y] major, [Z] minor failure modes.
VERDICT: [Ship | Rework | Kill]

## Rules

- No mercy, no softening, no alternatives required
- Minimum 5 failure modes — push for more
- Rank by impact, not by how easy they are to find
- This mode ends when the report is delivered
