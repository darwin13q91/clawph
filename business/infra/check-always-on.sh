#!/bin/bash
# Check if system is configured for 24/7 operation

echo "🔍 Checking 24/7 Always-On Configuration..."
echo "=============================================="

ERRORS=0

# Check 1: Sleep targets masked
echo ""
echo "[1/6] Checking sleep targets..."
if systemctl is-enabled sleep.target 2>&1 | grep -q "masked\|disabled"; then
    echo "  ✅ Sleep target is masked/disabled"
else
    echo "  ❌ Sleep target is NOT masked (run always-on.sh)"
    ERRORS=$((ERRORS+1))
fi

# Check 2: Lid switch behavior
echo ""
echo "[2/6] Checking lid close behavior..."
LID_HANDLE=$(systemctl show systemd-logind -p HandleLidSwitch 2>/dev/null | cut -d= -f2)
if [ "$LID_HANDLE" = "ignore" ]; then
    echo "  ✅ Lid close = ignore"
else
    echo "  ❌ Lid close = $LID_HANDLE (should be 'ignore')"
    ERRORS=$((ERRORS+1))
fi

# Check 3: TLP configuration
echo ""
echo "[3/6] Checking TLP power settings..."
if [ -f /etc/tlp.conf ]; then
    if grep -q "SLEEP_ON_AC_DISABLE=1" /etc/tlp.conf; then
        echo "  ✅ TLP sleep disabled on AC"
    else
        echo "  ❌ TLP sleep not configured"
        ERRORS=$((ERRORS+1))
    fi
else
    echo "  ⚠️  TLP not installed (optional but recommended)"
fi

# Check 4: Screen blanking
echo ""
echo "[4/6] Checking screen blanking..."
CONSOLE_BLANK=$(cat /sys/class/graphics/fbcon/console_blank 2>/dev/null || echo "unknown")
if [ "$CONSOLE_BLANK" = "0" ]; then
    echo "  ✅ Console blanking disabled"
else
    echo "  ⚠️  Console blanking = $CONSOLE_BLANK (may still work)"
fi

# Check 5: No-sleep service
echo ""
echo "[5/6] Checking no-sleep service..."
if systemctl is-active no-sleep.service >/dev/null 2>&1; then
    echo "  ✅ no-sleep.service is running"
else
    echo "  ❌ no-sleep.service is NOT running"
    echo "     Install: sudo cp infra/no-sleep.service /etc/systemd/system/"
    echo "     Enable:  sudo systemctl enable --now no-sleep.service"
    ERRORS=$((ERRORS+1))
fi

# Check 6: Keepalive cron
echo ""
echo "[6/6] Checking keepalive cron..."
if crontab -l 2>/dev/null | grep -q "keepalive.sh"; then
    echo "  ✅ Keepalive cron job installed"
else
    echo "  ❌ Keepalive cron job NOT installed"
    ERRORS=$((ERRORS+1))
fi

# Summary
echo ""
echo "=============================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ System is configured for 24/7 operation!"
    echo ""
    echo "Your laptop will:"
    echo "  • Stay awake even when lid is closed"
    echo "  • Never sleep or hibernate"
    echo "  • Keep agents running continuously"
    exit 0
else
    echo "❌ Found $ERRORS issue(s) - run always-on.sh to fix"
    exit 1
fi
