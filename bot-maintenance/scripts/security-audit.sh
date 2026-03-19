#!/bin/bash
# Security Hardening and Audit
# Run monthly for security checks

echo "🔒 Security Audit"
echo "================="
echo ""

# 1. Check for failed login attempts
echo "[1/6] Failed login attempts:"
lastb 2>/dev/null | head -10 || echo "No failed logins (or requires sudo)"

echo ""
echo "[2/6] Checking for unauthorized users:"
cat /etc/passwd | grep -E ":(100[0-9]|[0-9]{4,}):" | cut -d: -f1

echo ""
echo "[3/6] Open ports:"
ss -tulpn 2>/dev/null | grep LISTEN | head -20

echo ""
echo "[4/6] Checking for rootkits (rkhunter)..."
if command -v rkhunter >/dev/null; then
    sudo rkhunter --check --sk 2>&1 | tail -20
else
    echo "rkhunter not installed (optional)"
fi

echo ""
echo "[5/6] Firewall status:"
if command -v ufw >/dev/null; then
    sudo ufw status verbose
else
    echo "UFW not installed"
fi

echo ""
echo "[6/6] Checking for world-writable files:"
find /home/darwin -type f -perm -002 2>/dev/null | head -10 || echo "None found"

echo ""
echo "✅ Security audit complete"
echo "Review any warnings above and take action if needed"
