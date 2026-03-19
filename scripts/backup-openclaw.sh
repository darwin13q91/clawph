#!/bin/bash
# OpenClaw Backup Script
# Run this to backup all OpenClaw configuration before updating

BACKUP_DIR="$HOME/openclaw-backup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup at: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

# 1. Backup workspace (SOUL.md, AGENTS.md, skills, docs, etc.)
echo "📁 Backing up workspace..."
cp -r "$HOME/.openclaw/workspace" "$BACKUP_DIR/"

# 2. Backup agents directory (Echo, River, Atlas, Piper, etc.)
echo "🤖 Backing up agents..."
cp -r "$HOME/.openclaw/agents" "$BACKUP_DIR/"

# 3. Backup config files
echo "⚙️  Backing up configuration..."
cp "$HOME/.openclaw/openclaw.json" "$BACKUP_DIR/" 2>/dev/null || echo "  (openclaw.json not found)"
cp "$HOME/.openclaw/config.yaml" "$BACKUP_DIR/" 2>/dev/null || echo "  (config.yaml not found)"
cp "$HOME/.openclaw/.env" "$BACKUP_DIR/" 2>/dev/null || echo "  (.env not found - make sure to backup manually!)"

# 4. Backup any custom skills
echo "🛠️  Backing up skills..."
cp -r "$HOME/.openclaw/skills" "$BACKUP_DIR/" 2>/dev/null || echo "  (skills directory not found)"

# 5. Backup memory/decision logs
echo "🧠 Backing up memory..."
cp -r "$HOME/.openclaw/memory" "$BACKUP_DIR/" 2>/dev/null || echo "  (memory directory not found)"

# 6. Backup amajungle project (if exists)
if [ -d "$HOME/.openclaw/amajungle" ]; then
    echo "🌐 Backing up amajungle website..."
    cp -r "$HOME/.openclaw/amajungle" "$BACKUP_DIR/"
fi

# 7. Create backup manifest
echo "📝 Creating backup manifest..."
cat > "$BACKUP_DIR/BACKUP_MANIFEST.txt" << EOF
OpenClaw Backup Manifest
========================
Date: $(date)
User: $(whoami)
Hostname: $(hostname)

Contents:
- workspace/: Core OpenClaw workspace (SOUL.md, AGENTS.md, skills, docs)
- agents/: All agent configurations (Echo, River, Atlas, Piper, etc.)
- openclaw.json: Main configuration file
- config.yaml: Alternative config (if exists)
- .env: Environment variables/secrets (CRITICAL - keep secure!)
- skills/: Custom skills
- memory/: Decision logs and memory
- amajungle/: Website project (if exists)

RESTORE INSTRUCTIONS:
1. After updating OpenClaw, restore directories to ~/.openclaw/
2. Restore .env file (contains API keys and secrets)
3. Restart OpenClaw gateway
4. Verify all agents are functional

CRITICAL FILES TO VERIFY:
- ~/.openclaw/.env (API keys, tokens)
- ~/.openclaw/openclaw.json (agent configs)
- ~/.openclaw/workspace/SOUL.md (your personality)
- ~/.openclaw/workspace/AGENTS.md (agent definitions)
EOF

echo ""
echo "✅ Backup complete!"
echo "📦 Location: $BACKUP_DIR"
echo ""
echo "IMPORTANT: Secure your .env file - it contains API keys!"
echo ""
echo "To restore after update:"
echo "  cp -r $BACKUP_DIR/* ~/.openclaw/"
