#!/bin/bash
# test-client-context.sh - Test client context system
# Run this on VPS

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CLIENTS_DIR="/opt/openclaw/clients"
TEMPLATE="$CLIENTS_DIR/template_context.json"

echo -e "${BLUE}=========================================="
echo "Client Context System Test"
echo "==========================================${NC}"
echo ""

PASS=0
FAIL=0

check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASS++)) || true
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAIL++)) || true
}

# Test 1: Directory structure
echo "[1/6] Checking directory structure..."
if [ -d "$CLIENTS_DIR" ]; then
    check_pass "Clients directory exists"
else
    check_fail "Clients directory missing: $CLIENTS_DIR"
fi

# Test 2: Template file
echo ""
echo "[2/6] Checking template file..."
if [ -f "$TEMPLATE" ]; then
    check_pass "Template file exists"
    
    # Validate JSON
    if python3 -c "import json; json.load(open('$TEMPLATE'))" 2>/dev/null; then
        check_pass "Template JSON is valid"
    else
        check_fail "Template JSON is invalid"
    fi
else
    check_fail "Template file missing: $TEMPLATE"
fi

# Test 3: List existing clients
echo ""
echo "[3/6] Listing existing clients..."
CLIENT_COUNT=0
for client_dir in "$CLIENTS_DIR"/*/; do
    if [ -d "$client_dir" ]; then
        client_id=$(basename "$client_dir")
        if [ "$client_id" != "template_context.json" ]; then
            echo "  Found client: $client_id"
            ((CLIENT_COUNT++)) || true
        fi
    fi
done

if [ $CLIENT_COUNT -gt 0 ]; then
    check_pass "Found $CLIENT_COUNT client(s)"
else
    echo -e "${YELLOW}  No clients configured yet (use add-client.sh to create one)${NC}"
fi

# Test 4: Validate all client contexts
echo ""
echo "[4/6] Validating client contexts..."
VALID_CLIENTS=0
INVALID_CLIENTS=0

for client_dir in "$CLIENTS_DIR"/*/; do
    if [ -d "$client_dir" ]; then
        client_id=$(basename "$client_dir")
        context_file="$client_dir/context.json"
        
        if [ -f "$context_file" ]; then
            if python3 -c "import json; json.load(open('$context_file'))" 2>/dev/null; then
                ((VALID_CLIENTS++)) || true
            else
                echo -e "${RED}  Invalid JSON: $client_id${NC}"
                ((INVALID_CLIENTS++)) || true
            fi
        fi
    fi
done

if [ $VALID_CLIENTS -gt 0 ]; then
    check_pass "$VALID_CLIENTS valid client context(s)"
fi

if [ $INVALID_CLIENTS -gt 0 ]; then
    check_fail "$INVALID_CLIENTS invalid client context(s)"
fi

# Test 5: Context structure validation
echo ""
echo "[5/6] Validating context structure..."

python3 << 'PYTHON_SCRIPT'
import json
import sys
from pathlib import Path

REQUIRED_FIELDS = ["client_id", "business_name", "business_type"]
OPTIONAL_BUT_RECOMMENDED = ["personality", "knowledge_base", "common_qa"]

clients_dir = Path("/opt/openclaw/clients")
issues = []

for context_file in clients_dir.rglob("context.json"):
    try:
        with open(context_file) as f:
            data = json.load(f)
        
        client_id = context_file.parent.name
        
        # Check required fields
        for field in REQUIRED_FIELDS:
            if field not in data:
                issues.append(f"{client_id}: Missing required field '{field}'")
        
        # Check recommended fields
        for field in OPTIONAL_BUT_RECOMMENDED:
            if field not in data:
                issues.append(f"{client_id}: Missing recommended field '{field}'")
        
        # Validate knowledge_base structure
        kb = data.get("knowledge_base", {})
        if not isinstance(kb, dict):
            issues.append(f"{client_id}: knowledge_base should be an object")
        
        # Validate common_qa structure
        qa = data.get("common_qa", {})
        if not isinstance(qa, dict):
            issues.append(f"{client_id}: common_qa should be an object")
            
    except Exception as e:
        issues.append(f"{context_file}: Error validating - {e}")

if issues:
    for issue in issues:
        print(f"  ⚠ {issue}")
    sys.exit(1)
else:
    print("  All contexts have valid structure")
    sys.exit(0)
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    check_pass "Context structure is valid"
else
    check_fail "Some contexts have structural issues (see above)"
fi

# Test 6: Memory and stats files
echo ""
echo "[6/6] Checking memory and stats files..."

for client_dir in "$CLIENTS_DIR"/*/; do
    if [ -d "$client_dir" ]; then
        client_id=$(basename "$client_dir")
        
        # Create memory.json if missing
        if [ ! -f "$client_dir/memory.json" ]; then
            echo "[]" > "$client_dir/memory.json"
            echo "  Created memory.json for $client_id"
        fi
        
        # Create stats.json if missing
        if [ ! -f "$client_dir/stats.json" ]; then
            cat > "$client_dir/stats.json" << 'EOF'
{
  "message_count": 0,
  "ai_calls": 0,
  "simple_responses": 0,
  "errors": 0,
  "tokens_used": 0,
  "estimated_cost": 0.0
}
EOF
            echo "  Created stats.json for $client_id"
        fi
    fi
done

check_pass "Memory and stats files initialized"

# Summary
echo ""
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo "==========================================${NC}"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ Client context system is ready!${NC}"
    echo ""
    echo "To add a new client:"
    echo "  ./add-client.sh <client-id> <business-name>"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠ Some issues found. Please review.${NC}"
    exit 1
fi
