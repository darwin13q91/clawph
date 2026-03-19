# Knowledge Changelog

Track all knowledge base changes.

## Format

```markdown
## [YYYY-MM-DD] — [Short description]
- File: [which file was changed]
- Change: [what changed]
- Reason: [why it needed updating]
- Agent: [who prompted this update]
```

---

## 2026-03-18 — AGENTS.md Atlas Section Updated
- File: `workspace/AGENTS.md`
- Change: Added Skills Path reference and detailed skill list for Atlas
- Reason: Document Atlas's planned skill infrastructure
- Agent: Allysa

## 2026-03-18 — River Audit Report Generation Skill Created
- File: `agents/river/skills/audit-report-generation/SKILL.md`
- Change: Created comprehensive audit report template and methodology
- Includes: 8-section template, scoring methodology, revenue calculations, audit tiers
- Reason: Standardize Amazon audit reports for client delivery
- Agent: Darwin

## 2026-03-18 — River Skills Path Prepared
- File: `agents/river/skills/README.md`
- Change: Created skill directory structure for River (6 skills)
- Skills: amazon-audit, competitive-intelligence, pricing-optimization, store-analysis, asin-research, market-trends
- Reason: Document River's Amazon analysis capabilities
- Agent: Darwin

## 2026-03-18 — SOUL Files Consolidated to Correct Path
- **Issue:** SOUL files existed in `/.openclaw/agents/` (root) but NOT in `/home/darwin/.openclaw/agents/` (home)
- **Action:** Copied all 6 SOUL files to `/home/darwin/.openclaw/agents/[agent]/`
- **Files copied:**
  - `agents/atlas/DEV_SOUL.md`
  - `agents/echo/SUPPORT_SOUL.md`
  - `agents/piper/EMAIL_SOUL.md`
  - `agents/river/AMAZON_SOUL.md`
  - `agents/scout/SCOUT_SOUL.md`
  - `agents/trader/TRADER_SOUL.md`
- **Updated:** `workspace/AGENTS.md` with full SOUL paths
- **Standard:** All agent files now in `/home/darwin/.openclaw/` (accessible, consistent)
- **Agent:** Atlas (infrastructure consolidation)

## 2026-03-18 — IMAP/SMTP Skill Complete (Final)
- File: `agents/piper/skills/imap-smtp/SKILL.md`
- Change: Added DMARC deep dive, DNS failure fixes, delivery diagnosis steps, common errors table
- Final skill size: ~21,000 bytes
- Complete coverage: SMTP sending, IMAP reading, DNS auth (SPF/DKIM/DMARC), troubleshooting, escalation
- Reason: Comprehensive email protocol reference for the entire AmaJungle fleet
- Agent: Darwin

## 2026-03-18 — IMAP/SMTP Skill Complete
- File: `agents/piper/skills/imap-smtp/SKILL.md`
- Change: Added production IMAP functions (get_unread_emails, mark_as_read) and DNS check script
- Final skill size: ~17,000 bytes
- Includes: SMTP sending, IMAP reading, DNS authentication, troubleshooting, testing commands
- Reason: Complete email protocol reference for the AmaJungle fleet
- Agent: Darwin

## 2026-03-18 — IMAP/SMTP Skill Enhanced
- File: `agents/piper/skills/imap-smtp/SKILL.md`
- Change: Added production-ready send_email() function, .env variables, manual testing commands
- Reason: Complete SMTP implementation reference for Piper
- Agent: Darwin

## 2026-03-18 — IMAP/SMTP Skill Created for Piper
- File: `agents/piper/skills/imap-smtp/SKILL.md`
- Change: Created comprehensive email protocol skill with SMTP sending, IMAP reading, DNS authentication
- Includes: Python code examples, DNS record requirements, troubleshooting guide
- Reason: Centralized email protocol documentation for Piper and Echo
- Agent: Darwin

## 2026-03-18 — Piper Skills Path Prepared
- File: `agents/piper/skills/README.md`
- Change: Created skill directory structure for Piper (6 new skills + 7 existing)
- New skills: email-campaigns, inbox-triage, template-management, delivery-optimization, list-management, analytics-tracking
- Existing: client-onboarding, cold-outreach, crm-management, hot-closing, lead-scoring, referral-activation, subject-line-crafting, warm-nurture
- Reason: Document Piper's email systems capabilities
- Agent: Darwin

## 2026-03-18 — Error Handling Skill Created for Atlas
- File: `agents/atlas/skills/error-handling/SKILL.md`
- Change: Created comprehensive error handling skill with Python/Bash patterns, logging setup, actionable messages
- Includes: Script template with proper error handling
- Reason: Standardized approach to errors, logging, and recovery
- Agent: Darwin

## 2026-03-18 — Process Management Skill Created for Atlas
- File: `agents/atlas/skills/process-management/SKILL.md`
- Change: Created comprehensive cron and process management skill with zombie handling, lock files, cron environment
- Includes: process-health.sh script for fleet diagnostics
- Reason: Systematic approach to process and cron management
- Agent: Darwin

## 2026-03-18 — Python Debugging Skill Created for Atlas
- File: `agents/atlas/skills/python-debugging/SKILL.md`
- Change: Created comprehensive Python debugging skill with traceback reading, scope errors, debugging strategies
- Includes: debug-check.py script for environment diagnostics
- Reason: Systematic approach to Python debugging for infrastructure scripts
- Agent: Darwin

## 2026-03-18 — Atlas Skills Path Prepared
- File: `agents/atlas/skills/README.md`
- Change: Created skill directory structure for Atlas (5 skills planned)
- Skills: infrastructure-maintenance, security-hardening, deployment-automation, monitoring-alerting, debugging-troubleshooting
- Reason: Prepare infrastructure for Atlas's skill development
- Agent: Darwin

## 2026-03-18 — SOUL.md Skills Table Updated
- File: `workspace/SOUL.md`
- Change: Simplified skills table to 3 columns (Skill, Location, Purpose) with concise descriptions
- Reason: Cleaner reference format for quick lookup
- Agent: Darwin

## 2026-03-18 — Context Manager Finalized
- File: `agents/master/skills/context-manager/SKILL.md`
- Change: Added escalation rules for memory management edge cases
- Reason: Complete context management framework
- Agent: Darwin

## 2026-03-18 — Communication Protocol Skill Added
- File: `agents/master/skills/communication-protocol/SKILL.md`
- Change: Added 9th and final skill — channel-specific formatting for Telegram, email, and agent delegation
- Reason: Standardize communication across all channels for clarity and brevity
- Agent: mylabs husband

## 2026-03-18 — Context Manager Enhanced
- File: `agents/master/skills/context-manager/SKILL.md`
- Change: Added daily log format, compaction checklist, and context hygiene rules
- Reason: Complete context management framework with practical templates
- Agent: mylabs husband

## 2026-03-18 — MEMORY.md Template Created
- File: `workspace/MEMORY.md.template`
- Change: Created template based on Darwin's structure with quick reference tables
- Reason: Standardize memory file format for consistency
- Agent: Darwin (structure), Allysa (template)

## 2026-03-18 — Context Manager Skill Added
- File: `agents/master/skills/context-manager/SKILL.md`
- Change: Added 8th skill — session continuity and context layer architecture
- Reason: Systematic approach to maintaining continuity across sessions and managing memory layers
- Agent: mylabs husband

## 2026-03-18 — Escalation Handler Enhanced
- File: `agents/master/skills/escalation-handler/SKILL.md`
- Change: Added escalation examples (good/bad), rules for non-response, and policy-creation triggers
- Reason: Complete the escalation framework with practical examples
- Agent: mylabs husband

## 2026-03-18 — Escalation Handler Skill Added
- File: `agents/master/skills/escalation-handler/SKILL.md`
- Change: Added 7th skill — 4-tier escalation framework for knowing when to involve human
- Reason: Systematic approach to human-in-the-loop decisions
- Agent: mylabs husband

## 2026-03-18 — Final Skills Deployed
- File: `agents/master/skills/security-auditor/SKILL.md`, `agents/master/skills/performance-monitor/SKILL.md`
- Change: Added 2 final skills — Security Auditor (fleet security posture) and Performance Monitor (metrics and alerts)
- Reason: Complete Allysa's orchestration capability with security and performance oversight
- Agent: mylabs husband

## 2026-03-18 — Allysa SOUL Updated
- File: `workspace/SOUL.md`
- Change: Added Allysa's Skills section with 6 skills (Pipeline Architecture, Risk Assessment, Decision Tracking, Knowledge Manager, Fleet Orchestration, Strategic Challenge)
- Reason: Document new skills for orchestration and meta-cognition
- Agent: Allysa

## 2026-03-18 — Pipeline Architecture Refactor
- File: `agents/echo/scripts/echo_monitor.py`, `agents/echo/scripts/pipeline_bridge.py`, `agents/river/scripts/store_analyzer.py`, `agents/piper/scripts/audit_handler.py`
- Change: Switched Scout from mock data to real browser automation using `fast-audit.sh`
- Reason: Scout was generating fake data instead of real Amazon product data
- Agent: Allysa (Atlas assisted)

## 2026-03-18 — New Skills Deployed
- File: `agents/master/skills/pipeline-architecture/SKILL.md`, `agents/master/skills/risk-assessment/SKILL.md`, `agents/master/skills/decision-tracking/SKILL.md`, `agents/master/skills/knowledge-manager/SKILL.md`
- Change: Created 4 new skills for Allysa (Master Orchestrator)
- Reason: Systematic approach to pipeline design, risk management, decision logging, and knowledge maintenance
- Agent: mylabs husband

## 2026-03-18 — Policies Established
- File: `memory/policies.md`
- Change: Added 7 standing policies (embedding provider, agent timeouts, thinking mode, security, risk thresholds, discount authorization)
- Reason: Codify decisions that apply going forward
- Agent: Allysa

---

Last updated: 2026-03-18
