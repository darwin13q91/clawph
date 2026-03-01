#!/usr/bin/env bash
# ============================================================================
# Amazon-Client Service - Client Onboarding Script
# ============================================================================
# Usage: ./onboard-client.sh <business_name> <amazon_seller_id> <tier>
# 
# Arguments:
#   business_name      - Client's business name (e.g., "Acme Corp")
#   amazon_seller_id   - Amazon Seller ID (e.g., "A1B2C3D4E5F6")
#   tier               - Pricing tier: starter|growth|pro|enterprise
#
# Environment:
#   SP_API_CLIENT_ID       - Amazon SP-API Client ID
#   SP_API_CLIENT_SECRET   - Amazon SP-API Client Secret (encrypted)
#   MASTER_ENCRYPTION_KEY  - Master key for credential encryption
#   AC_BASE_DOMAIN         - Base domain for webhooks (e.g., "api.yourdomain.com")
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENTS_DIR="${SCRIPT_DIR}/../clients"
SECRETS_DIR="${CLIENTS_DIR}/secrets"
TEMPLATES_DIR="${CLIENTS_DIR}/templates"
COMPOSE_FILE="${SCRIPT_DIR}/../docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/../.env"

# Pricing tiers and bot allocation
TIER_STARTER=("inventory-bot" "pricing-bot")
TIER_GROWTH=("inventory-bot" "pricing-bot" "review-bot" "competitor-bot")
TIER_PRO=("inventory-bot" "pricing-bot" "review-bot" "competitor-bot" "customer-service-bot" "analytics-bot")
TIER_ENTERPRISE=("inventory-bot" "pricing-bot" "review-bot" "competitor-bot" "customer-service-bot" "analytics-bot")

# Pricing per tier (monthly)
PRICE_STARTER=300
PRICE_GROWTH=600
PRICE_PRO=1200
PRICE_ENTERPRISE=2500

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

generate_id() {
    # Generate a unique client ID (3-digit, zero-padded)
    local next_id
    next_id=$(ls -1 "${SECRETS_DIR}" 2>/dev/null | grep -E '^client-[0-9]{3}$' | wc -l)
    next_id=$((next_id + 1))
    printf "client-%03d" "$next_id"
}

generate_password() {
    # Generate secure random password
    openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
}

generate_api_key() {
    # Generate API key for dashboard
    openssl rand -hex 32
}

encrypt_credential() {
    # Encrypt credential using master key
    local plaintext="$1"
    echo "$plaintext" | openssl enc -aes-256-cbc -a -salt -pbkdf2 -pass pass:"${MASTER_ENCRYPTION_KEY}" 2>/dev/null
}

decrypt_credential() {
    # Decrypt credential
    local encrypted="$1"
    echo "$encrypted" | openssl enc -aes-256-cbc -d -a -pbkdf2 -pass pass:"${MASTER_ENCRYPTION_KEY}" 2>/dev/null
}

# ============================================================================
# VALIDATION
# ============================================================================

validate_args() {
    if [ $# -lt 3 ]; then
        echo "Usage: $0 <business_name> <amazon_seller_id> <tier>"
        echo ""
        echo "Arguments:"
        echo "  business_name      - Client's business name"
        echo "  amazon_seller_id   - Amazon Seller ID (e.g., A1B2C3D4E5F6)"
        echo "  tier               - Pricing tier: starter|growth|pro|enterprise"
        echo ""
        echo "Environment Variables Required:"
        echo "  SP_API_CLIENT_ID       - Amazon SP-API Client ID"
        echo "  SP_API_CLIENT_SECRET   - Amazon SP-API Client Secret"
        echo "  MASTER_ENCRYPTION_KEY  - Master key for encryption"
        echo "  AC_BASE_DOMAIN         - Base domain for webhooks"
        exit 1
    fi

    # Validate tier
    case "$3" in
        starter|growth|pro|enterprise)
            ;;
        *)
            log_error "Invalid tier: $3. Must be starter, growth, pro, or enterprise"
            exit 1
            ;;
    esac

    # Check required environment variables
    if [ -z "${SP_API_CLIENT_ID:-}" ]; then
        log_error "SP_API_CLIENT_ID environment variable not set"
        exit 1
    fi

    if [ -z "${MASTER_ENCRYPTION_KEY:-}" ]; then
        log_error "MASTER_ENCRYPTION_KEY environment variable not set"
        exit 1
    fi

    if [ -z "${AC_BASE_DOMAIN:-}" ]; then
        log_error "AC_BASE_DOMAIN environment variable not set"
        exit 1
    fi
}

# ============================================================================
# CLIENT SETUP
# ============================================================================

setup_client_directory() {
    local client_id="$1"
    local client_dir="${SECRETS_DIR}/${client_id}"
    
    log_info "Creating client directory: ${client_dir}"
    
    mkdir -p "${client_dir}"
    chmod 700 "${client_dir}"
    
    # Create subdirectories
    mkdir -p "${client_dir}"/{config,logs,credentials}
    chmod 700 "${client_dir}/credentials"
    
    log_success "Client directory created with 700 permissions"
}

create_database() {
    local client_id="$1"
    local db_password
    db_password=$(generate_password)
    
    log_info "Creating PostgreSQL database for ${client_id}"
    
    # Create database initialization script
    cat > "${SECRETS_DIR}/${client_id}/init-db.sql" << EOF
CREATE USER ${client_id} WITH PASSWORD '${db_password}';
CREATE DATABASE ${client_id}_data OWNER ${client_id};
GRANT ALL PRIVILEGES ON DATABASE ${client_id}_data TO ${client_id};
\c ${client_id}_data
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS pricing;
CREATE SCHEMA IF NOT EXISTS reviews;
CREATE SCHEMA IF NOT EXISTS competitors;
CREATE SCHEMA IF NOT EXISTS analytics;
EOF
    
    # Encrypt and store DB password
    encrypt_credential "$db_password" > "${SECRETS_DIR}/${client_id}/credentials/db_password.enc"
    chmod 600 "${SECRETS_DIR}/${client_id}/credentials/db_password.enc"
    
    log_success "Database configuration created"
    echo "$db_password"
}

store_sp_api_credentials() {
    local client_id="$1"
    local seller_id="$2"
    local refresh_token="$3"
    
    log_info "Storing SP-API credentials (encrypted)"
    
    # Create credentials file with encrypted values
    cat > "${SECRETS_DIR}/${client_id}/credentials/sp-api.enc" << EOF
{
  "seller_id": "$(encrypt_credential "$seller_id")",
  "refresh_token": "$(encrypt_credential "$refresh_token")",
  "client_id": "$(encrypt_credential "${SP_API_CLIENT_ID}")",
  "aws_access_key": "$(encrypt_credential "${AWS_ACCESS_KEY_ID:-}")",
  "aws_secret_key": "$(encrypt_credential "${AWS_SECRET_ACCESS_KEY:-}")",
  "updated_at": "$(date -Iseconds)"
}
EOF
    
    chmod 600 "${SECRETS_DIR}/${client_id}/credentials/sp-api.enc"
    
    log_success "SP-API credentials encrypted and stored"
}

create_client_config() {
    local client_id="$1"
    local business_name="$2"
    local tier="$3"
    local db_password="$4"
    local api_key
    api_key=$(generate_api_key)
    
    log_info "Creating client configuration"
    
    # Determine bots based on tier
    local bots="[]"
    case "$tier" in
        starter)
            bots='["inventory-bot", "pricing-bot"]'
            ;;
        growth)
            bots='["inventory-bot", "pricing-bot", "review-bot", "competitor-bot"]'
            ;;
        pro)
            bots='["inventory-bot", "pricing-bot", "review-bot", "competitor-bot", "customer-service-bot", "analytics-bot"]'
            ;;
        enterprise)
            bots='["inventory-bot", "pricing-bot", "review-bot", "competitor-bot", "customer-service-bot", "analytics-bot"]'
            ;;
    esac
    
    # Create client config JSON
    cat > "${SECRETS_DIR}/${client_id}/config/client.json" << EOF
{
  "client_id": "${client_id}",
  "business_name": "${business_name}",
  "tier": "${tier}",
  "created_at": "$(date -Iseconds)",
  "database": {
    "host": "postgres-${client_id}",
    "port": 5432,
    "name": "${client_id}_data",
    "user": "${client_id}"
  },
  "bots": ${bots},
  "api_key": "${api_key}",
  "webhooks": {
    "base_url": "https://${AC_BASE_DOMAIN}/webhook/${client_id}",
    "inventory": "https://${AC_BASE_DOMAIN}/webhook/${client_id}/inventory",
    "pricing": "https://${AC_BASE_DOMAIN}/webhook/${client_id}/pricing",
    "reviews": "https://${AC_BASE_DOMAIN}/webhook/${client_id}/reviews",
    "competitors": "https://${AC_BASE_DOMAIN}/webhook/${client_id}/competitors",
    "analytics": "https://${AC_BASE_DOMAIN}/webhook/${client_id}/analytics"
  },
  "features": {
    "auto_repricing": $(if [ "$tier" != "starter" ]; then echo "true"; else echo "false"; fi),
    "advanced_analytics": $(if [ "$tier" = "pro" ] || [ "$tier" = "enterprise" ]; then echo "true"; else echo "false"; fi),
    "priority_support": $(if [ "$tier" = "enterprise" ]; then echo "true"; else echo "false"; fi),
    "custom_integrations": $(if [ "$tier" = "enterprise" ]; then echo "true"; else echo "false"; fi)
  }
}
EOF
    
    chmod 600 "${SECRETS_DIR}/${client_id}/config/client.json"
    
    log_success "Client configuration created"
    echo "$api_key"
}

generate_docker_compose_override() {
    local client_id="$1"
    local db_password="$2"
    
    log_info "Generating Docker Compose override for ${client_id}"
    
    cat >> "${COMPOSE_FILE}" << EOF

  # ============================================================================
  # CLIENT: ${client_id}
  # ============================================================================
  postgres-${client_id}:
    image: postgres:15-alpine
    container_name: ac-postgres-${client_id}
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${client_id}
      - POSTGRES_PASSWORD=${db_password}
      - POSTGRES_DB=${client_id}_data
    volumes:
      - postgres-${client_id}-data:/var/lib/postgresql/data
      - ./clients/secrets/${client_id}/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - ac-network
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

EOF

    # Add bot services based on tier
    local tier="$3"
    local bots
    case "$tier" in
        starter) bots="inventory-bot pricing-bot" ;;
        growth) bots="inventory-bot pricing-bot review-bot competitor-bot" ;;
        pro|enterprise) bots="inventory-bot pricing-bot review-bot competitor-bot customer-service-bot analytics-bot" ;;
    esac
    
    for bot in $bots; do
        cat >> "${COMPOSE_FILE}" << EOF
  ${bot}-${client_id}:
    extends:
      service: ${bot}
    container_name: ac-${bot}-${client_id}
    environment:
      - CLIENT_ID=${client_id}
      - DATABASE_URL=postgresql://${client_id}:${db_password}@postgres-${client_id}:5432/${client_id}_data
      - CLIENT_CONFIG_PATH=/app/config/client.json
      - SP_API_REFRESH_TOKEN_FILE=/app/credentials/refresh_token
    volumes:
      - ./clients/secrets/${client_id}/config:/app/config:ro
      - ./clients/secrets/${client_id}/credentials:/app/credentials:ro
      - ./clients/secrets/${client_id}/logs:/app/logs
    depends_on:
      - postgres-${client_id}
      - sp-api-gateway
    profiles: []  # Remove template profile

EOF
    done
    
    # Add volume declaration
    echo "  postgres-${client_id}-data:" >> "${COMPOSE_FILE}"
    
    log_success "Docker Compose override generated"
}

update_nginx_config() {
    local client_id="$1"
    local api_key="$2"
    
    log_info "Updating Nginx configuration"
    
    # Create client-specific nginx config
    cat > "${SCRIPT_DIR}/../shared/nginx/conf.d/${client_id}.conf" << EOF
# Client: ${client_id}
location /webhook/${client_id}/ {
    proxy_pass http://sp-api-gateway:3000/webhook/${client_id}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Client-ID ${client_id};
    proxy_set_header X-API-Key ${api_key};
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}

location /api/${client_id}/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd-${client_id};
    proxy_pass http://sp-api-gateway:3000/api/${client_id}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Client-ID ${client_id};
    proxy_set_header X-Real-IP \$remote_addr;
}
EOF
    
    # Create htpasswd file for dashboard access
    local dashboard_password
    dashboard_password=$(generate_password)
    echo "${client_id}:$(openssl passwd -apr1 "$dashboard_password")" > "${SCRIPT_DIR}/../shared/nginx/.htpasswd-${client_id}"
    chmod 600 "${SCRIPT_DIR}/../shared/nginx/.htpasswd-${client_id}"
    
    log_success "Nginx configuration updated"
    echo "$dashboard_password"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    log_info "=========================================="
    log_info "Amazon-Client Service - Client Onboarding"
    log_info "=========================================="
    
    # Validate inputs
    validate_args "$@"
    
    local business_name="$1"
    local amazon_seller_id="$2"
    local tier="$3"
    
    log_info "Business Name: ${business_name}"
    log_info "Amazon Seller ID: ${amazon_seller_id}"
    log_info "Tier: ${tier}"
    
    # Generate client ID
    local client_id
    client_id=$(generate_id)
    log_info "Generated Client ID: ${client_id}"
    
    # Create directory structure
    setup_client_directory "$client_id"
    
    # Create database
    local db_password
    db_password=$(create_database "$client_id")
    
    # Prompt for SP-API refresh token if not in environment
    local refresh_token="${SP_API_REFRESH_TOKEN:-}"
    if [ -z "$refresh_token" ]; then
        echo ""
        log_warning "SP_API_REFRESH_TOKEN not set in environment"
        echo -n "Enter Amazon SP-API Refresh Token: "
        read -s refresh_token
        echo ""
    fi
    
    # Store credentials
    store_sp_api_credentials "$client_id" "$amazon_seller_id" "$refresh_token"
    
    # Create client configuration
    local api_key
    api_key=$(create_client_config "$client_id" "$business_name" "$tier" "$db_password")
    
    # Generate Docker Compose entries
    generate_docker_compose_override "$client_id" "$db_password" "$tier"
    
    # Update nginx
    local dashboard_password
    dashboard_password=$(update_nginx_config "$client_id" "$api_key")
    
    # Create .env entry for client
    echo "CLIENT_${client_id//-/}_DB_PASSWORD=${db_password}" >> "$ENV_FILE"
    
    # Final output
    echo ""
    log_success "=========================================="
    log_success "CLIENT ONBOARDED SUCCESSFULLY"
    log_success "=========================================="
    echo ""
    echo -e "${GREEN}Client ID:${NC}        ${client_id}"
    echo -e "${GREEN}Business Name:${NC}    ${business_name}"
    echo -e "${GREEN}Tier:${NC}             ${tier}"
    echo ""
    echo -e "${BLUE}Webhook URLs:${NC}"
    echo "  Inventory:   https://${AC_BASE_DOMAIN}/webhook/${client_id}/inventory"
    echo "  Pricing:     https://${AC_BASE_DOMAIN}/webhook/${client_id}/pricing"
    echo "  Reviews:     https://${AC_BASE_DOMAIN}/webhook/${client_id}/reviews"
    echo "  Competitors: https://${AC_BASE_DOMAIN}/webhook/${client_id}/competitors"
    echo "  Analytics:   https://${AC_BASE_DOMAIN}/webhook/${client_id}/analytics"
    echo ""
    echo -e "${BLUE}Dashboard Access:${NC}"
    echo "  URL:       https://${AC_BASE_DOMAIN}/api/${client_id}/"
    echo "  Username:  ${client_id}"
    echo "  Password:  ${dashboard_password}"
    echo ""
    echo -e "${BLUE}API Key:${NC} ${api_key}"
    echo ""
    echo -e "${YELLOW}IMPORTANT:${NC} Save these credentials securely!"
    echo -e "${YELLOW}The dashboard password cannot be recovered.${NC}"
    echo ""
    log_info "Next steps:"
    echo "  1. Review the generated configuration in clients/secrets/${client_id}/"
    echo "  2. Run: docker-compose up -d postgres-${client_id}"
    echo "  3. Run: docker-compose up -d $(echo $tier | tr '[:lower:]' '[:upper:]')_BOTS"
    echo "  4. Test webhook endpoints"
    echo ""
    
    # Save summary to file
    cat > "${SECRETS_DIR}/${client_id}/ONBOARDING_SUMMARY.txt" << EOF
CLIENT ONBOARDING SUMMARY
=========================
Generated: $(date -Iseconds)

Client ID:        ${client_id}
Business Name:    ${business_name}
Amazon Seller ID: ${amazon_seller_id}
Tier:             ${tier}

DASHBOARD ACCESS
----------------
URL:       https://${AC_BASE_DOMAIN}/api/${client_id}/
Username:  ${client_id}
Password:  ${dashboard_password}

API Key:   ${api_key}

WEBHOOK ENDPOINTS
-----------------
Base:        https://${AC_BASE_DOMAIN}/webhook/${client_id}
Inventory:   https://${AC_BASE_DOMAIN}/webhook/${client_id}/inventory
Pricing:     https://${AC_BASE_DOMAIN}/webhook/${client_id}/pricing
Reviews:     https://${AC_BASE_DOMAIN}/webhook/${client_id}/reviews
Competitors: https://${AC_BASE_DOMAIN}/webhook/${client_id}/competitors
Analytics:   https://${AC_BASE_DOMAIN}/webhook/${client_id}/analytics

IMPORTANT: Store this file securely and delete after saving credentials.
EOF
    
    chmod 600 "${SECRETS_DIR}/${client_id}/ONBOARDING_SUMMARY.txt"
}

main "$@"
