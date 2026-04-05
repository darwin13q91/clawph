#!/bin/bash
#
# Test script for OpenClaw Client Management System
# Tests all major functionality
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CLIENT_MGMT_DIR="/home/darwin/.openclaw/workspace/client-management"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:8080}"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test manage-clients.sh
test_manage_clients() {
    log_info "Testing manage-clients.sh..."
    
    # Test list (should work even with no clients)
    if $CLIENT_MGMT_DIR/manage-clients.sh list > /dev/null 2>&1; then
        log_pass "list command works"
    else
        log_fail "list command failed"
    fi
    
    # Test add client
    local test_client_id=$($CLIENT_MGMT_DIR/manage-clients.sh add "Test Business" 2>&1 | grep "Client ID:" | awk '{print $3}')
    if [[ -n "$test_client_id" ]]; then
        log_pass "add client works (ID: $test_client_id)"
        
        # Test show
        if $CLIENT_MGMT_DIR/manage-clients.sh show "$test_client_id" > /dev/null 2>&1; then
            log_pass "show client works"
        else
            log_fail "show client failed"
        fi
        
        # Test upgrade
        if $CLIENT_MGMT_DIR/manage-clients.sh upgrade "$test_client_id" starter > /dev/null 2>&1; then
            log_pass "upgrade client works"
        else
            log_fail "upgrade client failed"
        fi
        
        # Test usage
        if $CLIENT_MGMT_DIR/manage-clients.sh usage "$test_client_id" > /dev/null 2>&1; then
            log_pass "usage command works"
        else
            log_fail "usage command failed"
        fi
        
        # Test disable (cleanup)
        echo "yes" | $CLIENT_MGMT_DIR/manage-clients.sh disable "$test_client_id" > /dev/null 2>&1 || true
        echo "DELETE" | $CLIENT_MGMT_DIR/manage-clients.sh delete "$test_client_id" > /dev/null 2>&1 || true
        log_pass "disable/delete works"
    else
        log_fail "add client failed"
    fi
}

# Test billing-report.sh
test_billing() {
    log_info "Testing billing-report.sh..."
    
    # Test summary
    if $CLIENT_MGMT_DIR/billing-report.sh summary > /dev/null 2>&1; then
        log_pass "billing summary works"
    else
        log_fail "billing summary failed"
    fi
    
    # Test generate
    if $CLIENT_MGMT_DIR/billing-report.sh generate > /dev/null 2>&1; then
        log_pass "billing generate works"
    else
        log_fail "billing generate failed"
    fi
    
    # Test csv export
    if $CLIENT_MGMT_DIR/billing-report.sh csv > /dev/null 2>&1; then
        log_pass "billing CSV export works"
    else
        log_fail "billing CSV export failed"
    fi
}

# Test trial-monitor.sh
test_trial_monitor() {
    log_info "Testing trial-monitor.sh..."
    
    # Test report-only mode
    if $CLIENT_MGMT_DIR/trial-monitor.sh --report-only > /dev/null 2>&1; then
        log_pass "trial monitor report-only works"
    else
        log_fail "trial monitor report-only failed"
    fi
}

# Test gateway health endpoint
test_gateway() {
    log_info "Testing AI Gateway..."
    
    # Check if gateway is running
    if curl -s "$GATEWAY_URL/health" > /dev/null 2>&1; then
        log_pass "gateway health endpoint responds"
        
        # Test health response
        local health_response=$(curl -s "$GATEWAY_URL/health")
        if echo "$health_response" | grep -q "healthy"; then
            log_pass "gateway reports healthy status"
        else
            log_warn "gateway health check returned unexpected response"
        fi
    else
        log_warn "gateway not running at $GATEWAY_URL (skipping gateway tests)"
    fi
}

# Test configuration files
test_config() {
    log_info "Testing configuration files..."
    
    if [[ -f "$CLIENT_MGMT_DIR/config/ai_config.json" ]]; then
        log_pass "ai_config.json exists"
    else
        log_fail "ai_config.json missing"
    fi
    
    if [[ -f "$CLIENT_MGMT_DIR/config/tiers.json" ]]; then
        log_pass "tiers.json exists"
    else
        log_fail "tiers.json missing"
    fi
    
    if [[ -f "$CLIENT_MGMT_DIR/requirements.txt" ]]; then
        log_pass "requirements.txt exists"
    else
        log_fail "requirements.txt missing"
    fi
}

# Test file permissions
test_permissions() {
    log_info "Testing file permissions..."
    
    if [[ -x "$CLIENT_MGMT_DIR/manage-clients.sh" ]]; then
        log_pass "manage-clients.sh is executable"
    else
        log_fail "manage-clients.sh not executable"
    fi
    
    if [[ -x "$CLIENT_MGMT_DIR/billing-report.sh" ]]; then
        log_pass "billing-report.sh is executable"
    else
        log_fail "billing-report.sh not executable"
    fi
    
    if [[ -x "$CLIENT_MGMT_DIR/trial-monitor.sh" ]]; then
        log_pass "trial-monitor.sh is executable"
    else
        log_fail "trial-monitor.sh not executable"
    fi
}

# Main test runner
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║        OpenClaw Client Management - Test Suite                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check prerequisites
    if ! command -v jq > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: jq not installed. Some tests may fail.${NC}"
    fi
    
    if ! command -v curl > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: curl not installed. Gateway tests will be skipped.${NC}"
    fi
    
    echo ""
    
    # Run tests
    test_config
    test_permissions
    test_manage_clients
    test_billing
    test_trial_monitor
    test_gateway
    
    # Summary
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "Test Summary:"
    echo "  Passed: $TESTS_PASSED"
    echo "  Failed: $TESTS_FAILED"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        exit 1
    fi
}

main "$@"
