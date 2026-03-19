# Workspace Cleanup Archive

**Date:** March 6, 2026  
**Archived by:** Allysa (Master Orchestrator)

## Summary

37 items were archived from the workspace root to clean up clutter. These files are preserved here for reference but are no longer actively used.

## Categories Archived

### 1. Patch/Fix Files (6)
- patch_cleanup.py
- patch_hybrid.py
- patch_return_type.py
- fix_gateway.py
- fix_gateway2.py
- fix-system.sh

**Why:** These were temporary fixes that have been applied. No longer needed in root.

### 2. Setup/Deploy Scripts (11)
- setup-hybrid-ai.sh
- setup-hybrid-simple.sh
- setup-local-bot.sh
- setup-v2-enhanced.sh
- setup-v2-native.sh
- setup-v2-simple.sh
- deploy-to-vps.sh
- export-for-vps.sh
- SIMPLE-DEPLOY.sh
- install-persona-os.sh

**Why:** Multiple old setup scripts. System is now configured and stable.

### 3. Master Agent Scripts (2)
- master-direct.sh
- master-router.py
- allysa_master.py

**Why:** Old master agent implementations. Current system uses OpenClaw native master.

### 4. Config Files (7)
- openclaw-v2.json
- openclaw-v2-native.json
- ai_config.json
- client_config.json
- context.json
- gateway_nginx.conf
- openclaw-clean-config.yaml

**Why:** Old configuration files. Current config is in `config/` folder.

### 5. Old Documentation (8)
- contrarian-strategist.md (duplicate of SOUL.md content)
- ARCHITECTURE.md
- CLEAN-ARCHITECTURE-EXPLAINED.md
- DEPLOY-DIGITALOCEAN.md
- VPS-DEPLOYMENT-GUIDE.md
- IMPLEMENTATION-v2-SUMMARY.md
- AI_GATEWAY_DEPLOYMENT.md
- MASTER-GUIDE.md

**Why:** Outdated documentation. Current docs are in `docs/` folder.

### 6. Folders (3)
- agents/ (empty — agents moved to /home/darwin/.openclaw/agents/)
- agentskills/ (separate project, not part of this workspace)
- sub-agents/ (old structure)

**Why:** Empty or moved to correct locations.

## What Remains in Workspace

### Essential Root Files
- AGENTS.md — Agent inventory
- HEARTBEAT.md — Daily checks
- IDENTITY.md — Identity config
- MEMORY.md — System memory
- README.md — Project readme
- SOUL.md — Allysa's personality
- TOOLS.md — Tool notes
- USER.md — User preferences
- WORKFLOW_AUTO.md — Automation docs

### Active Directories
- ai-gateway/
- apps/
- bot-maintenance/
- brain/
- build-everything/
- business/
- CFO/
- channels/
- client-management/
- config/
- core/
- data/
- docs/
- infrastructure/
- logs/
- memory/
- personal/
- scripts/
- skills/
- tunnel-server/
- vps/

## Recovery

If you need any of these files, they're preserved here. To restore:
```bash
cp /home/darwin/.openclaw/workspace/ARCHIVED/<filename> /home/darwin/.openclaw/workspace/
```
