#!/bin/bash
# Install AI Persona OS Skill

echo "Installing AI Persona OS from ClawHub..."

# Create skills directory
mkdir -p ~/.openclaw/skills

# Download and extract
cd /tmp
wget -q https://clawhub.ai/jeffjhunter/ai-persona-os/download -O ai-persona-os.zip 2>/dev/null || \
    curl -sL https://github.com/jeffjhunter/ai-persona-os/archive/refs/heads/main.zip -o ai-persona-os.zip 2>/dev/null

if [ -f ai-persona-os.zip ]; then
    unzip -q ai-persona-os.zip
    mv ai-persona-os* ~/.openclaw/skills/ai-persona-os 2>/dev/null || \
        mv ai-persona-os-main ~/.openclaw/skills/ai-persona-os
    rm -f ai-persona-os.zip
    echo "✅ AI Persona OS installed!"
else
    echo "❌ Download failed"
    exit 1
fi

# Verify
ls -la ~/.openclaw/skills/ai-persona-os/
