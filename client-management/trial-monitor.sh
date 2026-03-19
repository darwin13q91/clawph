#!/bin/bash
#
# Trial Monitor - Daily cron script for trial management
# Checks trial expirations, sends reminders, auto-downgrades expired trials
#

set -e

# Configuration
CLIENTS_DIR="/home/darwin/.openclaw/workspace/client-management/data/clients"
LOGS_DIR="/home/darwin/.openclaw/workspace/client-management/logs"
ALERT_EMAIL="${ALERT_EMAIL:-}"
TELEGRAM_ALERT_BOT="${TELEGRAM_ALERT_BOT:-}"
TELEGRAM_ALERT_CHAT="${TELEGRAM_ALERT_CHAT:-}"

# Ensure directories exist
mkdir -p "$LOGS_DIR"

# Get today's date in seconds
today_seconds=$(date +%s)
today=$(date +%Y-%m-%d)

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -Iseconds)
    echo "[$timestamp] [$level] $message" | tee -a "$LOGS_DIR/trial-monitor.log"
}

# Send Telegram notification (if configured)
send_telegram_alert() {
    local message="$1"
    
    if [[ -n "$TELEGRAM_ALERT_BOT" ]] && [[ -n "$TELEGRAM_ALERT_CHAT" ]]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_ALERT_BOT}/sendMessage" \
            -d "chat_id=${TELEGRAM_ALERT_CHAT}" \
            -d "text=${message}" \
            -d "parse_mode=Markdown" > /dev/null 2>&1 || true
    fi
}

# Calculate days until expiration
days_until() {
    local target_date="$1"
    local target_seconds=$(date -d "$target_date" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$target_date" +%s)
    echo $(( (target_seconds - today_seconds) / 86400 ))
}

# Check if a date is in the past
is_expired() {
    local target_date="$1"
    local target_seconds=$(date -d "$target_date" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$target_date" +%s)
    [[ $today_seconds -gt $target_seconds ]]
}

# Send reminder notification (simulated - would integrate with actual notification system)
send_reminder() {
    local client_id="$1"
    local business_name="$2"
    local days_left="$3"
    local telegram_chat="$4"
    
    log "INFO" "Sending ${days_left}-day reminder to $business_name ($client_id)"
    
    # Log the reminder
    echo "$(date -Iseconds) | REMINDER | $client_id | $business_name | ${days_left} days left" >> "$LOGS_DIR/reminders.log"
    
    # In production, this would send actual notifications via:
    # - Email
    # - Telegram bot message to admin
    # - Webhook to CRM
}

# Auto-downgrade expired trial
auto_downgrade() {
    local client_id="$1"
    local client_dir="$CLIENTS_DIR/$client_id"
    local config_file="$client_dir/config.json"
    
    log "WARN" "Auto-downgrading expired trial: $client_id"
    
    # Update status to expired
    if [[ -f "$config_file" ]]; then
        local temp_file=$(mktemp)
        jq '.status = "expired" | 
            .tier = "expired" |
            .ai_settings.enabled = false |
            .expired_at = now' "$config_file" > "$temp_file"
        mv "$temp_file" "$config_file"
        
        local business_name=$(jq -r '.business_name' "$config_file")
        
        log "INFO" "Downgraded $business_name ($client_id)"
        echo "$(date -Iseconds) | DOWNGRADED | $client_id | $business_name" >> "$LOGS_DIR/client_actions.log"
        
        # Send alert
        send_telegram_alert "⚠️ Trial Expired: $business_name ($client_id) has been auto-downgraded."
    fi
}

# Check for clients needing reminders
check_reminders() {
    log "INFO" "Checking for trial reminders..."
    
    local reminders_sent=0
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/config.json" ]]; then
            local config=$(cat "$client_dir/config.json")
            local client_id=$(basename "$client_dir")
            local tier=$(echo "$config" | jq -r '.tier')
            local status=$(echo "$config" | jq -r '.status')
            local trial_ends=$(echo "$config" | jq -r '.trial_ends // empty')
            local business_name=$(echo "$config" | jq -r '.business_name')
            local telegram_chat=$(echo "$config" | jq -r '.telegram_chat_id // empty')
            
            # Only process active trials
            if [[ "$tier" == "trial" ]] && [[ "$status" == "trial" ]] && [[ -n "$trial_ends" ]] && [[ "$trial_ends" != "null" ]]; then
                local days_left=$(days_until "$trial_ends")
                
                # Check if expired
                if [[ $days_left -lt 0 ]]; then
                    log "WARN" "Trial expired: $business_name ($client_id) expired $((days_left * -1)) days ago"
                    auto_downgrade "$client_id"
                    continue
                fi
                
                # Send reminders at 3 days and 1 day
                if [[ $days_left -eq 3 ]] || [[ $days_left -eq 1 ]]; then
                    send_reminder "$client_id" "$business_name" "$days_left" "$telegram_chat"
                    reminders_sent=$((reminders_sent + 1))
                fi
            fi
        fi
    done
    
    log "INFO" "Reminder check complete. Sent $reminders_sent reminders."
}

# Generate daily trial report
generate_daily_report() {
    local report_file="$LOGS_DIR/trial-report-${today}.json"
    
    local total_trials=0
    local expiring_3days=0
    local expiring_1day=0
    local expired=0
    local total_active=0
    
    declare -a trial_list
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/config.json" ]]; then
            local config=$(cat "$client_dir/config.json")
            local client_id=$(basename "$client_dir")
            local tier=$(echo "$config" | jq -r '.tier')
            local status=$(echo "$config" | jq -r '.status')
            local trial_ends=$(echo "$config" | jq -r '.trial_ends // empty')
            local business_name=$(echo "$config" | jq -r '.business_name')
            
            if [[ "$tier" == "trial" ]]; then
                total_trials=$((total_trials + 1))
                
                if [[ "$status" == "trial" ]] && [[ -n "$trial_ends" ]] && [[ "$trial_ends" != "null" ]]; then
                    local days_left=$(days_until "$trial_ends")
                    
                    if [[ $days_left -lt 0 ]]; then
                        expired=$((expired + 1))
                    elif [[ $days_left -le 3 ]]; then
                        expiring_3days=$((expiring_3days + 1))
                        if [[ $days_left -le 1 ]]; then
                            expiring_1day=$((expiring_1day + 1))
                        fi
                    fi
                    
                    trial_list+=("{\"client_id\":\"$client_id\",\"business_name\":\"$business_name\",\"days_left\":$days_left,\"expires\":\"$trial_ends\"}")
                fi
            fi
            
            if [[ "$status" == "active" ]] || [[ "$status" == "trial" ]]; then
                total_active=$((total_active + 1))
            fi
        fi
    done
    
    # Build JSON report
    local trials_json=$(IFS=,; echo "${trial_list[*]}")
    
    cat > "$report_file" << EOF
{
  "date": "$today",
  "generated_at": "$(date -Iseconds)",
  "summary": {
    "total_active_clients": $total_active,
    "total_trials": $total_trials,
    "expiring_3days": $expiring_3days,
    "expiring_1day": $expiring_1day,
    "expired": $expired
  },
  "trials": [$trials_json]
}
EOF
    
    log "INFO" "Daily report generated: $report_file"
    
    # Output summary to console
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  Daily Trial Report - $today              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Total Active Clients: $total_active"
    echo "Active Trials: $total_trials"
    echo ""
    echo "Expiring Soon:"
    echo "  - Within 3 days: $expiring_3days"
    echo "  - Within 1 day:  $expiring_1day"
    echo "  - Already expired: $expired"
    echo ""
}

# Send daily digest to admin
send_daily_digest() {
    local report_file="$LOGS_DIR/trial-report-${today}.json"
    
    if [[ ! -f "$report_file" ]]; then
        return
    fi
    
    local total_trials=$(jq -r '.summary.total_trials' "$report_file")
    local expiring_3days=$(jq -r '.summary.expiring_3days' "$report_file")
    local expiring_1day=$(jq -r '.summary.expiring_1day' "$report_file")
    local expired=$(jq -r '.summary.expired' "$report_file")
    
    local message="📊 *Daily Trial Report* - $today

*Summary:*
• Total Active Trials: $total_trials
• Expiring (3 days): $expiring_3days
• Expiring (1 day): $expiring_1day
• Expired: $expired

"
    
    # Add expiring trials details
    if [[ $expiring_3days -gt 0 ]]; then
        message+="*Trials Expiring Soon:*
"
        jq -r '.trials[] | select(.days_left <= 3) | "• \(.business_name) - \(.days_left) days"' "$report_file" >> /tmp/expiring.txt
        message+=$(cat /tmp/expiring.txt)
        rm -f /tmp/expiring.txt
    fi
    
    send_telegram_alert "$message"
}

# Cleanup old reports (keep last 30 days)
cleanup_old_reports() {
    find "$LOGS_DIR" -name "trial-report-*.json" -mtime +30 -delete 2>/dev/null || true
    log "INFO" "Cleaned up old reports (kept last 30 days)"
}

# Main execution
main() {
    log "INFO" "=== Trial Monitor Started ==="
    
    # Check if clients directory exists
    if [[ ! -d "$CLIENTS_DIR" ]]; then
        log "ERROR" "Clients directory not found: $CLIENTS_DIR"
        exit 1
    fi
    
    # Run checks
    check_reminders
    generate_daily_report
    
    # Send digest if configured
    if [[ -n "$TELEGRAM_ALERT_BOT" ]]; then
        send_daily_digest
    fi
    
    # Cleanup
    cleanup_old_reports
    
    log "INFO" "=== Trial Monitor Complete ==="
}

# Handle command line arguments
case "${1:-}" in
    --dry-run)
        echo "Dry run mode - no changes will be made"
        DRY_RUN=1
        main
        ;;
    --report-only)
        generate_daily_report
        ;;
    --check-only)
        check_reminders
        ;;
    --help|-h)
        echo "Trial Monitor for OpenClaw"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (no args)      Run full trial monitoring"
        echo "  --dry-run      Show what would happen without making changes"
        echo "  --report-only  Generate report only, no reminders"
        echo "  --check-only   Check reminders only, no report"
        echo "  --help         Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  ALERT_EMAIL         Email for alerts"
        echo "  TELEGRAM_ALERT_BOT  Bot token for Telegram alerts"
        echo "  TELEGRAM_ALERT_CHAT Chat ID for Telegram alerts"
        ;;
    *)
        main
        ;;
esac
