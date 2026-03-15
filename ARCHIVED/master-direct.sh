#!/bin/bash
# Master Agent Direct Control
# You (user) ask Allysa to respond as any agent

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  MASTER AGENT DIRECT CONTROL                               ║"
echo "║  Allysa responds as any client agent                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

AGENTS_FILE="/home/darwin/.openclaw/agents/agents.list"

# List agents
list_agents() {
    echo "=== ACTIVE CLIENT AGENTS ==="
    echo ""
    ls -1 /home/darwin/.openclaw/agents/agent_* 2>/dev/null | while read agent_dir; do
        if [ -d "$agent_dir" ]; then
            agent_id=$(basename "$agent_dir")
            config="$agent_dir/config.json"
            if [ -f "$config" ]; then
                name=$(jq -r '.client_name // "Unknown"' "$config")
                type=$(jq -r '.business_type // "general"' "$config")
                echo "📋 $name ($type)"
                echo "   ID: $agent_id"
                echo ""
            fi
        fi
    done
}

# Get agent info
get_agent_info() {
    local agent_id=$1
    local agent_dir="/home/darwin/.openclaw/agents/$agent_id"
    
    if [ ! -d "$agent_dir" ]; then
        echo "Agent not found"
        return 1
    fi
    
    # Load config
    local name=$(jq -r '.client_name // "Unknown"' "$agent_dir/config.json")
    local type=$(jq -r '.business_type // "general"' "$agent_dir/config.json")
    
    # Load memory if exists
    local hours="9 AM - 6 PM, Monday-Saturday"
    local contact="Via this chat"
    local specialties="General services"
    
    if [ -f "$agent_dir/MEMORY.md" ]; then
        # Parse memory file
        hours=$(grep -i "hours:" "$agent_dir/MEMORY.md" | cut -d: -f2- | xargs || echo "$hours")
        contact=$(grep -i "contact:" "$agent_dir/MEMORY.md" | cut -d: -f2- | xargs || echo "$contact")
        specialties=$(grep -i "specialties:" "$agent_dir/MEMORY.md" | cut -d: -f2- | xargs || echo "$specialties")
    fi
    
    echo ""
    echo "Agent: $name"
    echo "Type: $type"
    echo "Hours: $hours"
    echo "Contact: $contact"
    echo "Specialties: $specialties"
    echo ""
}

# Main
case "${1:-list}" in
    list)
        list_agents
        ;;
    info)
        get_agent_info "$2"
        ;;
    *)
        echo "Usage:"
        echo "  ./master-direct.sh list          # List all agents"
        echo "  ./master-direct.sh info <ID>     # Get agent info"
        echo ""
        echo "TO USE AN AGENT:"
        echo "  Just tell Allysa: 'Respond as [Agent Name] to: [message]'"
        echo ""
        echo "Example:"
        ;;
esac
