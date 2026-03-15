#!/bin/bash
#
# Client Management CLI for OpenClaw Multi-Tenant System
# Usage: ./manage-clients.sh [command] [options]
#

set -e

# Configuration
CLIENTS_DIR="/home/darwin/.openclaw/workspace/client-management/data/clients"
LOGS_DIR="/home/darwin/.openclaw/workspace/client-management/logs"
CONFIG_FILE="/home/darwin/.openclaw/workspace/client-management/config/tiers.json"
DATE_FORMAT="%Y-%m-%d"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "$CLIENTS_DIR" "$LOGS_DIR"

# Load tier configuration
load_tiers() {
    if [[ -f "$CONFIG_FILE" ]]; then
        cat "$CONFIG_FILE"
    else
        echo '{"tiers":{"trial":{"name":"Trial","price":0,"days":30,"messages_per_day":100},"starter":{"name":"Starter","price":300,"messages_per_day":1000},"growth":{"name":"Growth","price":600,"messages_per_day":5000},"pro":{"name":"Pro","price":1200,"messages_per_day":-1}}}'
    fi
}

# Generate unique client ID
generate_client_id() {
    echo "client_$(openssl rand -hex 8)"
}

# Get current date in ISO format
get_date() {
    date +%Y-%m-%d
}

# Get date N days from now
get_future_date() {
    local days=$1
    date -d "+${days} days" +%Y-%m-%d 2>/dev/null || date -v+${days}d +%Y-%m-%d
}

# Show usage
show_usage() {
    cat << EOF
OpenClaw Client Management CLI

Usage: $0 <command> [options]

Commands:
  list                    Show all clients with status
  add <business_name>     Create new client with trial
  upgrade <client_id> <tier>  Convert trial to paid tier
  disable <client_id>     Soft delete (keep data, disable access)
  delete <client_id>      Hard delete (permanent - USE WITH CAUTION)
  trials [days]           Show trials expiring within N days (default: 7)
  show <client_id>        Show detailed client information
  edit <client_id>        Edit client configuration interactively
  usage <client_id>       Show usage statistics for client
  
Tiers: trial, starter, growth, pro

Examples:
  $0 list
  $0 add "My Restaurant"
  $0 upgrade client_abc123 starter
  $0 trials 3
  $0 show client_abc123

EOF
}

# List all clients
list_clients() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                       OpenClaw Clients                                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [[ ! -d "$CLIENTS_DIR" ]] || [[ -z "$(ls -A "$CLIENTS_DIR" 2>/dev/null)" ]]; then
        echo -e "${YELLOW}No clients found.${NC}"
        return
    fi
    
    printf "%-20s %-20s %-12s %-12s %-10s\n" "Client ID" "Business Name" "Tier" "Status" "Expires"
    printf "%-20s %-20s %-12s %-12s %-10s\n" "--------" "-------------" "----" "------" "-------"
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/config.json" ]]; then
            local client_id=$(basename "$client_dir")
            local config=$(cat "$client_dir/config.json")
            local business_name=$(echo "$config" | grep -o '"business_name": "[^"]*"' | cut -d'"' -f4)
            local tier=$(echo "$config" | grep -o '"tier": "[^"]*"' | cut -d'"' -f4)
            local status=$(echo "$config" | grep -o '"status": "[^"]*"' | cut -d'"' -f4)
            local expires=$(echo "$config" | grep -o '"trial_ends": "[^"]*"' | cut -d'"' -f4)
            
            # Truncate business name if too long
            if [[ ${#business_name} -gt 18 ]]; then
                business_name="${business_name:0:17}..."
            fi
            
            # Color code status
            local status_color="$GREEN"
            if [[ "$status" == "disabled" ]]; then
                status_color="$RED"
            elif [[ "$status" == "trial" ]]; then
                status_color="$YELLOW"
            fi
            
            printf "%-20s %-20s %-12s ${status_color}%-12s${NC} %-10s\n" \
                "$client_id" "$business_name" "$tier" "$status" "$expires"
        fi
    done
    
    echo ""
    local total=$(find "$CLIENTS_DIR" -name "config.json" | wc -l)
    local active=$(grep -l '"status": "active"' "$CLIENTS_DIR"/*/config.json 2>/dev/null | wc -l)
    local trials=$(grep -l '"tier": "trial"' "$CLIENTS_DIR"/*/config.json 2>/dev/null | wc -l)
    
    echo -e "Total: $total | Active: ${GREEN}$active${NC} | Trials: ${YELLOW}$trials${NC}"
}

# Add new client
add_client() {
    local business_name="$1"
    
    if [[ -z "$business_name" ]]; then
        echo -e "${RED}Error: Business name required${NC}"
        echo "Usage: $0 add <business_name>"
        return 1
    fi
    
    local client_id=$(generate_client_id)
    local client_dir="$CLIENTS_DIR/$client_id"
    local trial_end=$(get_future_date 30)
    
    mkdir -p "$client_dir"
    
    # Create client configuration
    cat > "$client_dir/config.json" << EOF
{
  "client_id": "$client_id",
  "business_name": "$business_name",
  "tier": "trial",
  "status": "trial",
  "created_at": "$(date -Iseconds)",
  "trial_ends": "$trial_end",
  "billing": {
    "monthly_fee": 0,
    "messages_per_day": 100,
    "support_level": "basic"
  },
  "ai_settings": {
    "enabled": true,
    "model": "gpt-4o-mini",
    "max_tokens": 500,
    "temperature": 0.7,
    "system_prompt": "You are a helpful assistant for $business_name. Be friendly, professional, and concise in your responses."
  },
  "customization": {
    "response_style": "friendly",
    "greeting_message": "Hello! Welcome to $business_name. How can I help you today?",
    "business_hours": "9 AM - 6 PM, Monday-Saturday",
    "contact_info": "Contact us through this chat"
  },
  "webhook_url": "",
  "telegram_bot_token": "",
  "telegram_chat_id": "",
  "notes": ""
}
EOF
    
    # Create usage tracking file
    cat > "$client_dir/usage.json" << EOF
{
  "total_messages": 0,
  "messages_this_month": 0,
  "ai_calls": 0,
  "tokens_used": 0,
  "estimated_cost": 0.00,
  "monthly_history": {},
  "last_reset": "$(date -Iseconds)"
}
EOF
    
    # Create empty conversation memory
    echo "[]" > "$client_dir/memory.json"
    
    echo -e "${GREEN}✓ Client created successfully!${NC}"
    echo ""
    echo -e "Client ID: ${BLUE}$client_id${NC}"
    echo -e "Business: $business_name"
    echo -e "Tier: Trial (30 days)"
    echo -e "Trial expires: $trial_end"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Set up Telegram bot token: $0 edit $client_id"
    echo "2. Configure AI settings in: $client_dir/config.json"
    echo "3. Set up webhook in Telegram BotFather"
    
    # Log the creation
    echo "$(date -Iseconds) | CREATED | $client_id | $business_name | trial" >> "$LOGS_DIR/client_actions.log"
}

# Upgrade client to paid tier
upgrade_client() {
    local client_id="$1"
    local new_tier="$2"
    
    if [[ -z "$client_id" ]] || [[ -z "$new_tier" ]]; then
        echo -e "${RED}Error: Client ID and tier required${NC}"
        echo "Usage: $0 upgrade <client_id> <tier>"
        echo "Tiers: starter, growth, pro"
        return 1
    fi
    
    local client_dir="$CLIENTS_DIR/$client_id"
    local config_file="$client_dir/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}Error: Client not found: $client_id${NC}"
        return 1
    fi
    
    # Validate tier
    case "$new_tier" in
        starter|growth|pro)
            ;;
        *)
            echo -e "${RED}Error: Invalid tier. Use: starter, growth, or pro${NC}"
            return 1
            ;;
    esac
    
    # Get tier details
    local tier_name=$(echo "$new_tier" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
    local price=0
    local messages=0
    local support="basic"
    
    case "$new_tier" in
        starter)
            price=300
            messages=1000
            ;;
        growth)
            price=600
            messages=5000
            support="priority"
            ;;
        pro)
            price=1200
            messages=-1
            support="priority"
            ;;
    esac
    
    # Update config
    local temp_file=$(mktemp)
    jq --arg tier "$new_tier" \
       --arg price "$price" \
       --arg messages "$messages" \
       --arg support "$support" \
       '.tier = $tier | 
        .status = "active" | 
        .billing.monthly_fee = ($price | tonumber) | 
        .billing.messages_per_day = ($messages | tonumber) | 
        .billing.support_level = $support |
        .trial_ends = null |
        .updated_at = now' \
       "$config_file" > "$temp_file"
    
    mv "$temp_file" "$config_file"
    
    echo -e "${GREEN}✓ Client upgraded successfully!${NC}"
    echo ""
    echo -e "Client ID: $client_id"
    echo -e "New Tier: ${BLUE}$tier_name${NC}"
    echo -e "Monthly Fee: \$$price"
    echo -e "Messages/Day: $messages"
    echo -e "Support: $support"
    
    # Log the upgrade
    local business_name=$(jq -r '.business_name' "$config_file")
    echo "$(date -Iseconds) | UPGRADED | $client_id | $business_name | $new_tier" >> "$LOGS_DIR/client_actions.log"
}

# Disable client (soft delete)
disable_client() {
    local client_id="$1"
    
    if [[ -z "$client_id" ]]; then
        echo -e "${RED}Error: Client ID required${NC}"
        echo "Usage: $0 disable <client_id>"
        return 1
    fi
    
    local client_dir="$CLIENTS_DIR/$client_id"
    local config_file="$client_dir/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}Error: Client not found: $client_id${NC}"
        return 1
    fi
    
    local business_name=$(jq -r '.business_name' "$config_file")
    local current_status=$(jq -r '.status' "$config_file")
    
    if [[ "$current_status" == "disabled" ]]; then
        echo -e "${YELLOW}Client is already disabled${NC}"
        return 0
    fi
    
    read -p "Disable client '$business_name' ($client_id)? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Cancelled"
        return 0
    fi
    
    # Update status
    jq '.status = "disabled" | .disabled_at = now' "$config_file" > "$config_file.tmp"
    mv "$config_file.tmp" "$config_file"
    
    echo -e "${GREEN}✓ Client disabled${NC}"
    echo "Data retained at: $client_dir"
    
    # Log the action
    echo "$(date -Iseconds) | DISABLED | $client_id | $business_name" >> "$LOGS_DIR/client_actions.log"
}

# Delete client (hard delete)
delete_client() {
    local client_id="$1"
    
    if [[ -z "$client_id" ]]; then
        echo -e "${RED}Error: Client ID required${NC}"
        echo "Usage: $0 delete <client_id>"
        return 1
    fi
    
    local client_dir="$CLIENTS_DIR/$client_id"
    local config_file="$client_dir/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}Error: Client not found: $client_id${NC}"
        return 1
    fi
    
    local business_name=$(jq -r '.business_name' "$config_file")
    
    echo -e "${RED}⚠️  WARNING: This will PERMANENTLY delete all client data!${NC}"
    echo -e "Business: $business_name"
    echo -e "Client ID: $client_id"
    echo ""
    read -p "Type 'DELETE' to confirm permanent deletion: " confirm
    
    if [[ "$confirm" != "DELETE" ]]; then
        echo "Cancelled"
        return 0
    fi
    
    # Backup before delete
    local backup_dir="$LOGS_DIR/deleted/$(date +%Y%m%d)"
    mkdir -p "$backup_dir"
    cp -r "$client_dir" "$backup_dir/$client_id"
    
    # Delete
    rm -rf "$client_dir"
    
    echo -e "${GREEN}✓ Client permanently deleted${NC}"
    echo "Backup saved at: $backup_dir/$client_id"
    
    # Log the action
    echo "$(date -Iseconds) | DELETED | $client_id | $business_name" >> "$LOGS_DIR/client_actions.log"
}

# Show expiring trials
trials_expiring() {
    local days=${1:-7}
    local today=$(get_date)
    local cutoff=$(date -d "+${days} days" +%Y-%m-%d 2>/dev/null || date -v+${days}d +%Y-%m-%d)
    
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Trials Expiring Within $days Days                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    local found=0
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/config.json" ]]; then
            local config=$(cat "$client_dir/config.json")
            local tier=$(echo "$config" | jq -r '.tier // empty')
            local trial_ends=$(echo "$config" | jq -r '.trial_ends // empty')
            
            if [[ "$tier" == "trial" ]] && [[ -n "$trial_ends" ]] && [[ "$trial_ends" != "null" ]]; then
                if [[ "$trial_ends" < "$cutoff" ]] || [[ "$trial_ends" == "$cutoff" ]]; then
                    local client_id=$(basename "$client_dir")
                    local business_name=$(echo "$config" | jq -r '.business_name')
                    local days_left=$(( ($(date -d "$trial_ends" +%s) - $(date -d "$today" +%s)) / 86400 ))
                    
                    local color="$GREEN"
                    if [[ $days_left -le 1 ]]; then
                        color="$RED"
                    elif [[ $days_left -le 3 ]]; then
                        color="$YELLOW"
                    fi
                    
                    printf "%-20s %-25s ${color}%3d days${NC} (%s)\n" \
                        "$client_id" "$business_name" "$days_left" "$trial_ends"
                    ((found++))
                fi
            fi
        fi
    done
    
    if [[ $found -eq 0 ]]; then
        echo -e "${GREEN}No trials expiring within $days days${NC}"
    else
        echo ""
        echo -e "Found ${YELLOW}$found${NC} trials expiring soon"
    fi
}

# Show detailed client info
show_client() {
    local client_id="$1"
    
    if [[ -z "$client_id" ]]; then
        echo -e "${RED}Error: Client ID required${NC}"
        return 1
    fi
    
    local client_dir="$CLIENTS_DIR/$client_id"
    local config_file="$client_dir/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}Error: Client not found: $client_id${NC}"
        return 1
    fi
    
    local config=$(cat "$config_file")
    
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                        Client Details                                        ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo "$config" | jq -r '
    "Client ID:    \(.client_id)",
    "Business:     \(.business_name)",
    "Tier:         \(.tier)",
    "Status:       \(.status)",
    "",
    "Created:      \(.created_at)",
    "Trial Ends:   \(.trial_ends // "N/A (Paid Account)")",
    "",
    "📊 Billing:",
    "  Monthly Fee:     $\(.billing.monthly_fee)",
    "  Messages/Day:    \(.billing.messages_per_day)",
    "  Support Level:   \(.billing.support_level)",
    "",
    "🤖 AI Settings:",
    "  Model:        \(.ai_settings.model)",
    "  Max Tokens:   \(.ai_settings.max_tokens)",
    "  Temperature:  \(.ai_settings.temperature)",
    "  Enabled:      \(.ai_settings.enabled)",
    "",
    "📱 Contact:",
    "  Telegram Bot: \(.telegram_bot_token | if . == "" then "Not set" else "Set" end)",
    "  Chat ID:      \(.telegram_chat_id // "Not set")"
    '
    
    # Show usage stats if available
    if [[ -f "$client_dir/usage.json" ]]; then
        echo ""
        echo "📈 Usage Statistics:"
        cat "$client_dir/usage.json" | jq -r '
        "  Total Messages:  \(.total_messages)",
        "  Messages (MTD):  \(.messages_this_month)",
        "  AI Calls:        \(.ai_calls)",
        "  Tokens Used:     \(.tokens_used)",
        "  Est. Cost:       $\(.estimated_cost)"
        '
    fi
}

# Edit client configuration
edit_client() {
    local client_id="$1"
    
    if [[ -z "$client_id" ]]; then
        echo -e "${RED}Error: Client ID required${NC}"
        return 1
    fi
    
    local client_dir="$CLIENTS_DIR/$client_id"
    local config_file="$client_dir/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}Error: Client not found: $client_id${NC}"
        return 1
    fi
    
    local editor="${EDITOR:-nano}"
    $editor "$config_file"
    
    echo -e "${GREEN}✓ Configuration updated${NC}"
}

# Show usage statistics
show_usage() {
    local client_id="$1"
    
    if [[ -z "$client_id" ]]; then
        echo -e "${RED}Error: Client ID required${NC}"
        return 1
    fi
    
    local client_dir="$CLIENTS_DIR/$client_id"
    local usage_file="$client_dir/usage.json"
    local config_file="$client_dir/config.json"
    
    if [[ ! -f "$usage_file" ]]; then
        echo -e "${RED}Error: No usage data found for client: $client_id${NC}"
        return 1
    fi
    
    local usage=$(cat "$usage_file")
    local config=$(cat "$config_file")
    local business_name=$(echo "$config" | jq -r '.business_name')
    local limit=$(echo "$config" | jq -r '.billing.messages_per_day')
    local current=$(echo "$usage" | jq -r '.messages_this_month')
    
    echo -e "${BLUE}Usage Report for $business_name${NC}"
    echo ""
    
    echo "$usage" | jq -r '
    "Total Messages (All Time): \(.total_messages)",
    "Messages This Month:       \(.messages_this_month)",
    "AI API Calls:              \(.ai_calls)",
    "Tokens Used:               \(.tokens_used)",
    "Estimated AI Cost:         $\(.estimated_cost)",
    "Last Reset:                \(.last_reset)"
    '
    
    if [[ "$limit" != "-1" ]]; then
        echo ""
        local percentage=$((current * 100 / limit))
        echo "Daily Limit: $current / $limit ($percentage%)"
        
        if [[ $percentage -ge 90 ]]; then
            echo -e "${RED}⚠️  Approaching daily limit!${NC}"
        elif [[ $percentage -ge 75 ]]; then
            echo -e "${YELLOW}⚡ At 75% of daily limit${NC}"
        fi
    fi
}

# Main command dispatcher
main() {
    local command="$1"
    shift || true
    
    case "$command" in
        list)
            list_clients
            ;;
        add)
            add_client "$@"
            ;;
        upgrade)
            upgrade_client "$@"
            ;;
        disable)
            disable_client "$@"
            ;;
        delete)
            delete_client "$@"
            ;;
        trials)
            trials_expiring "$@"
            ;;
        show)
            show_client "$@"
            ;;
        edit)
            edit_client "$@"
            ;;
        usage)
            show_usage "$@"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
