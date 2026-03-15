#!/bin/bash
#
# Billing Report Generator for OpenClaw
# Generates monthly billing reports with usage and fees
#

set -e

# Configuration
CLIENTS_DIR="/home/darwin/.openclaw/workspace/client-management/data/clients"
REPORTS_DIR="/home/darwin/.openclaw/workspace/client-management/reports"
LOGS_DIR="/home/darwin/.openclaw/workspace/client-management/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$REPORTS_DIR" "$LOGS_DIR"

# Get current month/year
get_current_month() {
    date +"%Y-%m"
}

get_previous_month() {
    date -d "last month" +"%Y-%m" 2>/dev/null || date -v-1m +"%Y-%m"
}

# Show usage
show_usage() {
    cat << EOF
OpenClaw Billing Report Generator

Usage: $0 <command> [options]

Commands:
  generate [month]        Generate billing report (YYYY-MM format, default: current month)
  csv [month]             Export report to CSV
  invoice <client_id>     Generate invoice for specific client
  summary                 Show billing summary for all clients
  usage-costs             Calculate AI usage costs
  
Options:
  --format [csv|json|pdf] Output format (default: console)
  --output <path>         Output file path

Examples:
  $0 generate             # Generate report for current month
  $0 generate 2026-02     # Generate report for February 2026
  $0 csv 2026-02          # Export to CSV
  $0 invoice client_abc123 # Generate single invoice

EOF
}

# Tier pricing
get_tier_price() {
    local tier="$1"
    case "$tier" in
        trial) echo "0" ;;
        starter) echo "300" ;;
        growth) echo "600" ;;
        pro) echo "1200" ;;
        *) echo "0" ;;
    esac
}

get_tier_name() {
    local tier="$1"
    case "$tier" in
        trial) echo "Trial (Free)" ;;
        starter) echo "Starter" ;;
        growth) echo "Growth" ;;
        pro) echo "Pro" ;;
        *) echo "Unknown" ;;
    esac
}

# Calculate AI usage cost (estimated)
calculate_ai_cost() {
    local tokens="$1"
    # Approximate: $0.000015 per token (input + output average)
    local cost=$(echo "scale=4; $tokens * 0.000015" | bc 2>/dev/null || echo "0")
    printf "%.2f" "$cost"
}

# Generate billing report
generate_report() {
    local month="${1:-$(get_current_month)}"
    local output_format="${2:-console}"
    
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                     Billing Report - $month                              ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [[ ! -d "$CLIENTS_DIR" ]] || [[ -z "$(ls -A "$CLIENTS_DIR" 2>/dev/null)" ]]; then
        echo -e "${YELLOW}No clients found.${NC}"
        return
    fi
    
    local total_revenue=0
    local total_clients=0
    local total_messages=0
    local total_ai_costs=0
    
    # Header
    printf "%-20s %-25s %-12s %-10s %-12s %-12s\n" \
        "Client ID" "Business" "Tier" "Base Fee" "AI Cost" "Total"
    printf "%-20s %-25s %-12s %-10s %-12s %-12s\n" \
        "--------" "---------" "----" "--------" "-------" "-----"
    
    # Collect data
    declare -a report_data
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/config.json" ]]; then
            local config=$(cat "$client_dir/config.json")
            local client_id=$(basename "$client_dir")
            local business_name=$(echo "$config" | jq -r '.business_name')
            local tier=$(echo "$config" | jq -r '.tier')
            local status=$(echo "$config" | jq -r '.status')
            
            # Skip disabled clients unless they were active during the month
            if [[ "$status" == "disabled" ]]; then
                continue
            fi
            
            # Get usage data
            local usage_file="$client_dir/usage.json"
            local messages=0
            local tokens=0
            local ai_cost="0.00"
            
            if [[ -f "$usage_file" ]]; then
                local usage=$(cat "$usage_file")
                messages=$(echo "$usage" | jq -r ".monthly_history.\"$month\".messages // 0")
                tokens=$(echo "$usage" | jq -r ".monthly_history.\"$month\".tokens // 0")
                ai_cost=$(calculate_ai_cost "$tokens")
            fi
            
            local base_fee=$(get_tier_price "$tier")
            local total=$(echo "$base_fee + $ai_cost" | bc 2>/dev/null || echo "$base_fee")
            
            # Truncate business name
            if [[ ${#business_name} -gt 23 ]]; then
                business_name="${business_name:0:22}..."
            fi
            
            printf "%-20s %-25s %-12s $%-9s $%-11s $%-11s\n" \
                "$client_id" "$business_name" "$tier" "$base_fee" "$ai_cost" "$total"
            
            total_revenue=$(echo "$total_revenue + $total" | bc 2>/dev/null || echo "$total_revenue")
            total_clients=$((total_clients + 1))
            total_messages=$((total_messages + messages))
            total_ai_costs=$(echo "$total_ai_costs + $ai_cost" | bc 2>/dev/null || echo "$total_ai_costs")
        fi
    done
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
    printf "%-58s $%-11s\n" "Total Base Revenue:" "$(echo "$total_revenue - $total_ai_costs" | bc 2>/dev/null || echo "0")"
    printf "%-58s $%-11s\n" "Total AI Usage Costs:" "$total_ai_costs"
    printf "%-58s $%-11s\n" "Grand Total:" "$total_revenue"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo -e "Active Clients: ${GREEN}$total_clients${NC} | Total Messages: ${BLUE}$total_messages${NC}"
    
    # Save report to file
    local report_file="$REPORTS_DIR/billing-${month}.json"
    cat > "$report_file" << EOF
{
  "month": "$month",
  "generated_at": "$(date -Iseconds)",
  "summary": {
    "total_clients": $total_clients,
    "total_messages": $total_messages,
    "base_revenue": $(echo "$total_revenue - $total_ai_costs" | bc 2>/dev/null || echo "0"),
    "ai_costs": $total_ai_costs,
    "total_revenue": $total_revenue
  }
}
EOF
    
    echo ""
    echo -e "Report saved: ${BLUE}$report_file${NC}"
}

# Export to CSV
export_csv() {
    local month="${1:-$(get_current_month)}"
    local output_file="$REPORTS_DIR/billing-${month}.csv"
    
    # CSV Header
    echo "Client ID,Business Name,Tier,Status,Base Fee,Messages,Tokens,AI Cost,Total,Generated At" > "$output_file"
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/config.json" ]]; then
            local config=$(cat "$client_dir/config.json")
            local client_id=$(basename "$client_dir")
            local business_name=$(echo "$config" | jq -r '.business_name')
            local tier=$(echo "$config" | jq -r '.tier')
            local status=$(echo "$config" | jq -r '.status')
            local base_fee=$(get_tier_price "$tier")
            
            local usage_file="$client_dir/usage.json"
            local messages=0
            local tokens=0
            local ai_cost="0.00"
            
            if [[ -f "$usage_file" ]]; then
                local usage=$(cat "$usage_file")
                messages=$(echo "$usage" | jq -r ".monthly_history.\"$month\".messages // 0")
                tokens=$(echo "$usage" | jq -r ".monthly_history.\"$month\".tokens // 0")
                ai_cost=$(calculate_ai_cost "$tokens")
            fi
            
            local total=$(echo "$base_fee + $ai_cost" | bc 2>/dev/null || echo "$base_fee")
            
            # Escape business name for CSV
            business_name=$(echo "$business_name" | sed 's/"/""/g')
            
            echo "$client_id,\"$business_name\",$tier,$status,$base_fee,$messages,$tokens,$ai_cost,$total,$(date -Iseconds)" >> "$output_file"
        fi
    done
    
    echo -e "${GREEN}✓ CSV exported to: $output_file${NC}"
}

# Generate invoice for single client
generate_invoice() {
    local client_id="$1"
    local month="${2:-$(get_current_month)}"
    
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
    local business_name=$(echo "$config" | jq -r '.business_name')
    local tier=$(echo "$config" | jq -r '.tier')
    local base_fee=$(get_tier_price "$tier")
    
    local usage_file="$client_dir/usage.json"
    local messages=0
    local tokens=0
    local ai_cost="0.00"
    
    if [[ -f "$usage_file" ]]; then
        local usage=$(cat "$usage_file")
        messages=$(echo "$usage" | jq -r ".monthly_history.\"$month\".messages // 0")
        tokens=$(echo "$usage" | jq -r ".monthly_history.\"$month\".tokens // 0")
        ai_cost=$(calculate_ai_cost "$tokens")
    fi
    
    local total=$(echo "$base_fee + $ai_cost" | bc 2>/dev/null || echo "$base_fee")
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║                           INVOICE                                         ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Invoice Date: $(date +"%B %d, %Y")"
    echo "  Billing Period: $month"
    echo "  Invoice #: INV-${month}-${client_id: -6}"
    echo ""
    echo "  Bill To:"
    echo "    $business_name"
    echo "    Client ID: $client_id"
    echo ""
    echo "  ─────────────────────────────────────────────────────────────────────────"
    echo "  Description                              Quantity    Rate        Amount"
    echo "  ─────────────────────────────────────────────────────────────────────────"
    printf "  %-40s %4s        $%7s    $%8s\n" "$(get_tier_name $tier) Plan" "1" "$base_fee.00" "$base_fee.00"
    if (( $(echo "$ai_cost > 0" | bc -l) )); then
        printf "  %-40s %4s        $%7s    $%8s\n" "AI Usage ($tokens tokens)" "1" "$ai_cost" "$ai_cost"
    fi
    echo "  ─────────────────────────────────────────────────────────────────────────"
    printf "  %-63s $%8s\n" "Total Due:" "$total"
    echo "  ─────────────────────────────────────────────────────────────────────────"
    echo ""
    echo "  Messages sent this month: $messages"
    echo ""
    
    # Save invoice
    local invoice_file="$REPORTS_DIR/invoice-${client_id}-${month}.txt"
    cat > "$invoice_file" << EOF
INVOICE
=======

Invoice Date: $(date +"%B %d, %Y")
Billing Period: $month
Invoice #: INV-${month}-${client_id: -6}

Bill To:
  $business_name
  Client ID: $client_id

Description                              Amount
$(get_tier_name $tier) Plan              \$$base_fee.00
AI Usage ($tokens tokens)                \$$ai_cost

Total Due: \$$total

Messages sent this month: $messages
EOF
    
    echo "Invoice saved: $invoice_file"
}

# Show billing summary
show_summary() {
    echo -e "${BLUE}Billing Summary${NC}"
    echo ""
    
    local total_clients=0
    local total_revenue=0
    declare -A tier_counts
    declare -A tier_revenue
    
    tier_counts[trial]=0
    tier_counts[starter]=0
    tier_counts[growth]=0
    tier_counts[pro]=0
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/config.json" ]]; then
            local config=$(cat "$client_dir/config.json")
            local tier=$(echo "$config" | jq -r '.tier')
            local status=$(echo "$config" | jq -r '.status')
            
            if [[ "$status" == "active" ]]; then
                tier_counts[$tier]=$((tier_counts[$tier] + 1))
                local price=$(get_tier_price "$tier")
                tier_revenue[$tier]=$(echo "${tier_revenue[$tier]:-0} + $price" | bc)
                total_revenue=$(echo "$total_revenue + $price" | bc)
                total_clients=$((total_clients + 1))
            fi
        fi
    done
    
    echo "Active Clients by Tier:"
    echo "  Trial:   ${tier_counts[trial]} clients"
    echo "  Starter: ${tier_counts[starter]} clients (\$${tier_revenue[starter]:-0}/mo)"
    echo "  Growth:  ${tier_counts[growth]} clients (\$${tier_revenue[growth]:-0}/mo)"
    echo "  Pro:     ${tier_counts[pro]} clients (\$${tier_revenue[pro]:-0}/mo)"
    echo ""
    echo "Total Monthly Recurring Revenue: \$$total_revenue"
    echo "Total Active Clients: $total_clients"
}

# Show AI usage costs
show_usage_costs() {
    echo -e "${BLUE}AI Usage Costs (Estimated)${NC}"
    echo ""
    
    local total_tokens=0
    local total_cost=0
    
    printf "%-20s %-25s %-12s %-12s\n" "Client ID" "Business" "Tokens" "Est. Cost"
    printf "%-20s %-25s %-12s %-12s\n" "--------" "---------" "------" "---------"
    
    for client_dir in "$CLIENTS_DIR"/*/; do
        if [[ -f "$client_dir/usage.json" ]]; then
            local client_id=$(basename "$client_dir")
            local config=$(cat "$client_dir/config.json")
            local business_name=$(echo "$config" | jq -r '.business_name')
            local usage=$(cat "$client_dir/usage.json")
            local tokens=$(echo "$usage" | jq -r '.tokens_used // 0')
            local cost=$(calculate_ai_cost "$tokens")
            
            if [[ ${#business_name} -gt 23 ]]; then
                business_name="${business_name:0:22}..."
            fi
            
            printf "%-20s %-25s %-12s $%-11s\n" "$client_id" "$business_name" "$tokens" "$cost"
            
            total_tokens=$((total_tokens + tokens))
            total_cost=$(echo "$total_cost + $cost" | bc)
        fi
    done
    
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    printf "%-47s %-12s $%-11s\n" "Total:" "$total_tokens" "$total_cost"
    echo "════════════════════════════════════════════════════════════════"
}

# Main dispatcher
main() {
    local command="$1"
    shift || true
    
    case "$command" in
        generate)
            generate_report "$@"
            ;;
        csv)
            export_csv "$@"
            ;;
        invoice)
            generate_invoice "$@"
            ;;
        summary)
            show_summary
            ;;
        usage-costs)
            show_usage_costs
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
