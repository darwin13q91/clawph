# AGENT FLEET CONFIGURATION MANIFEST
# Version: 2026.03.17
# Status: PROTECTED
# 
# ⚠️ WARNING: This file is auto-generated and protected
# Do not modify manually - use protect-configs.sh to enforce protection

## Agent Inventory

### Active Agents (8)

| Agent | Role | Status | SOUL.md | Skills | Scripts |
|-------|------|--------|---------|--------|---------|
| **Allysa** | Master Orchestrator | 🟢 Active | ✅ 900+ lines | 13 workspace | - |
| **Echo** | Email Support | 🟢 Active | ✅ 914 lines | 8 skills | 10 scripts |
| **River** | Amazon Empire Builder | 🟢 Active | ✅ 699 lines | 24 skills | 23 scripts |
| **Atlas** | Infrastructure | 🟢 Active | ✅ 648 lines | 16 skills | 18 scripts |
| **Piper** | Email Systems | 🟢 Active | ✅ 577 lines | 9 skills | 10 scripts |
| **Pixel** | UX/UI Design | 🟢 Ready | ✅ 218 lines | 6 skills | - |
| **Scout** | Browser/Research | 🟢 Ready | ✅ 255 lines | 5 skills | Handler modules |
| **Trader** | Markets | 🟢 Ready | ✅ 253 lines | 6 skills | - |

### Config-Only Agents (2)

| Agent | Role | Status | Location |
|-------|------|--------|----------|
| **Aishi** | Personal Assistant | 🟢 Ready | AGENTS.md only |
| **Namie** | Fashion/Career Advisor | 🟢 Ready | AGENTS.md only |

---

## Configuration Paths

### Agent Configurations
```
~/.openclaw/agents/
├── echo/
│   ├── SOUL.md (READ-ONLY)
│   ├── scripts/*.py (READ+EXEC)
│   └── skills/*/SKILL.md (READ-ONLY)
├── river/
│   ├── SOUL.md (READ-ONLY)
│   ├── scripts/*.py (READ+EXEC)
│   └── skills/*/SKILL.md (READ-ONLY)
├── piper/
│   ├── SOUL.md (READ-ONLY)
│   ├── scripts/*.py (READ+EXEC)
│   └── skills/*/SKILL.md (READ-ONLY)
├── atlas/
│   ├── SOUL.md (READ-ONLY)
│   ├── scripts/*.py (READ+EXEC)
│   └── skills/*/SKILL.md (READ-ONLY)
├── scout/
│   ├── SOUL.md (READ-ONLY)
│   ├── scripts/*.py (READ+EXEC)
│   └── skills/*/SKILL.md (READ-ONLY)
├── pixel/
│   ├── SOUL.md (READ-ONLY)
│   ├── scripts/*.py (READ+EXEC)
│   └── skills/*/SKILL.md (READ-ONLY)
└── trader/
    ├── SOUL.md (READ-ONLY)
    └── skills/*/SKILL.md (READ-ONLY)
```

### Workspace Configurations
```
~/.openclaw/workspace/
├── SOUL.md (READ-ONLY) - Master orchestrator SOUL
├── AGENTS.md (READ-ONLY) - Agent registry
├── MEMORY.md (READ-ONLY) - System memory
├── USER.md (READ-ONLY) - User preferences
├── HEARTBEAT.md (READ-ONLY) - Daily routines
├── TOOLS.md (READ-ONLY) - Tool configurations
└── skills/*/SKILL.md (READ-ONLY) - Shared skills
```

---

## Protection Status

| Resource | Permission | Status |
|----------|------------|--------|
| SOUL.md files | 444 (read-only) | ✅ Protected |
| SKILL.md files | 444 (read-only) | ✅ Protected |
| Agent scripts | 555 (rx) | ✅ Protected |
| Config files | 444 (read-only) | ✅ Protected |

### Protection Enforcement

**Command to verify/re-enforce protection:**
```bash
~/.openclaw/agents/atlas/scripts/protect-configs.sh
```

**Add to cron for daily protection check:**
```bash
0 4 * * * ~/.openclaw/agents/atlas/scripts/protect-configs.sh >> ~/.openclaw/agents/atlas/logs/protection.log 2>&1
```

---

## Backup Information

| Backup Type | Location | Frequency |
|-------------|----------|-----------|
| Full Config | ~/.openclaw/config-backup/YYYYMMDD/ | On demand |
| Agent .backup/ | Each agent's .backup/ directory | Manual |
| Git | Various repos | Varies |

### Latest Backup
- **Date:** 2026-03-17
- **Location:** ~/.openclaw/config-backup/20260317/
- **Contents:** 7 agents + workspace configs

---

## Modification Policy

### Who Can Modify

| Actor | Can Modify | Method |
|-------|------------|--------|
| MyLabs Husband | All configs | Manual edit with chmod +w |
| Allysa | None (read-only) | Reports only |
| Atlas | None (read-only) | Reports only |
| Sub-agents | None (read-only) | Cannot modify |

### How to Modify (Emergency)

```bash
# 1. Make writable
chmod 644 ~/.openclaw/workspace/SOUL.md

# 2. Edit
nano ~/.openclaw/workspace/SOUL.md

# 3. Re-protect
~/.openclaw/agents/atlas/scripts/protect-configs.sh
```

---

## Validation Checksums

Run to verify config integrity:
```bash
find ~/.openclaw/agents -name "SOUL.md" -exec sha256sum {} \; > ~/.openclaw/config-checksums.txt
```

---

*Last updated: 2026-03-17*
*Protected by: Atlas Infrastructure Agent*
