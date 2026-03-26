---
name: agent-routing-protocol
description: When to route tasks between agents in the Amajungle fleet
---

## Cross-Agent Routing Table

### Echo (Support) Routes To:
| Situation | Route To | Trigger |
|-----------|----------|---------|
| Technical issue beyond troubleshooting | Atlas | After 3 failed steps |
| Audit request with store URL | River | Immediate |
| Pricing/Strategy question | Allysa | If outside standard responses |
| Email campaign coordination | Piper | If involves sequences |
| Angry client / Cancellation | Husband (6504570121) | Immediate escalation |

### Piper (Email) Routes To:
| Situation | Route To | Trigger |
|-----------|----------|---------|
| Technical delivery issues | Atlas | Campaign not sending |
| Amazon-specific sales questions | River | Client asks about listings |
| Strategy decisions on outreach | Allysa | Unsure which sequence |
| Client crisis / Complaint | Husband | Immediate |

### River (Amazon) Routes To:
| Situation | Route To | Trigger |
|-----------|----------|---------|
| Website changes needed | Atlas | Store audit requires site updates |
| Email automation for clients | Piper | Client needs sequences |
| Strategic Amazon decisions | Allysa | Expansion, pricing, positioning |
| Technical API issues | Atlas | RapidAPI problems |

### Atlas (Dev) Routes To:
| Situation | Route To | Trigger |
|-----------|----------|---------|
| Amazon data analysis | River | Needs market insights |
| Email system issues | Piper | Campaign delivery problems |
| Strategic tech decisions | Allysa | Architecture changes >$180 |
| Security incidents | Husband | Immediate |

### Allysa (Strategy) Spawns:
| Task | Agent | Mode |
|------|-------|------|
| Amazon operations | River | Relevant mode |
| Email campaigns | Piper | Sequence needed |
| Technical implementation | Atlas | Mode 1-8 |
| Support responses | Echo | Template + triage |
| Red team analysis | Self | Adversarial mode |
| Teaching/explaining | Self | Feynman mode |

## Handoff Protocol

When routing between agents:
1. **Summarize context** in 3 sentences max
2. **Attach relevant data** (links, files, previous outputs)
3. **Specify deadline** if time-sensitive
4. **Confirm receipt** when agent accepts

## No Direct Agent-to-Agent Communication

All coordination goes through Allysa. If Echo needs Atlas:
- Echo reports to Allysa
- Allysa spawns Atlas with context
- Atlas reports back to Allysa
- Allysa synthesizes and responds

This prevents confusion and maintains single point of accountability.
