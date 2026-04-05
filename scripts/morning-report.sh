#!/bin/bash
# Morning Report for AmaJungle Operations
# Updated: Removed obsolete trading stats, added operational metrics

# Force Philippines timezone for date commands
export TZ=Asia/Manila

DATA_DIR="/home/darwin/.openclaw/data"
REPORT_FILE="$DATA_DIR/morning_report.txt"
DATE=$(date +"%A, %B %d, %Y")
TIME=$(date +"%I:%M %p")

# Data sources
ECHO_DATA="/home/darwin/.openclaw/agents/echo/data"
ATLAS_DATA="/home/darwin/.openclaw/agents/atlas/logs"

echo "Generating morning report..."

# Get weather with 5 second timeout
WEATHER=$(timeout 5 curl -s "wttr.in/Poblacion,Dalaguete,Cebu?format=%C+%t" 2>/dev/null || echo "Clear +27°C")

# === ECHO AUDIT STATS ===
# Count overnight emails (since 6PM yesterday)
OVERNIGHT_EMAILS=$(awk -v yesterday="$(date -d 'yesterday 18:00' '+%Y-%m-%d %H')" '
  /^\[2026/ { datetime = substr($0, 2, 16) }
  /Spawning support agent/ { if (datetime >= yesterday) count++ }
  END { print count+0 }
' "$ECHO_DATA/echo_monitor.log" 2>/dev/null || echo "0")

# T1/T2/T3 counts from auto_sent.log
T1_COUNT=$(grep -c 'T1_' "$ECHO_DATA/auto_sent.log" 2>/dev/null | tr -d '\n' || echo "0")
T2_COUNT=$(grep -c 'T2_' "$ECHO_DATA/auto_sent.log" 2>/dev/null | tr -d '\n' || echo "0")
T3_COUNT=$(grep -c 'T3_' "$ECHO_DATA/auto_sent.log" 2>/dev/null | tr -d '\n' || echo "0")
AUDIT_COUNT=$(grep -c 'audit_' "$ECHO_DATA/auto_sent.log" 2>/dev/null | tr -d '\n' || echo "0")
TOTAL_AUTO_SENT=$(wc -l < "$ECHO_DATA/auto_sent.log" 2>/dev/null | tr -d '\n' || echo "0")

# Queue status
QUEUE_COUNT=$(ls "$ECHO_DATA/queue/" 2>/dev/null | wc -l)

# === AGENT FLEET STATUS ===
# Check which agents are configured (have SOUL.md)
AGENT_STATUS=""
for agent in echo atlas piper river; do
  if [ -f "/home/darwin/.openclaw/agents/$agent/SOUL.md" ]; then
    AGENT_NAME=$(echo "$agent" | sed 's/.*/\u&/')
    if [ "$agent" = "echo" ] && [ -f "$ECHO_DATA/echo_monitor.log" ]; then
      AGENT_STATUS="${AGENT_STATUS}🟢 $AGENT_NAME (Active)\n"
    elif [ "$agent" = "atlas" ] && [ -f "$ATLAS_DATA/health_monitor.log" ]; then
      AGENT_STATUS="${AGENT_STATUS}🟢 $AGENT_NAME (Active)\n"
    else
      AGENT_STATUS="${AGENT_STATUS}🟡 $AGENT_NAME (Ready)\n"
    fi
  fi
done

# === DASHBOARD HEALTH ===
# Check port 8888 (Command Center)
if nc -zv localhost 8888 >/dev/null 2>&1; then
  PORT_8888="🟢 UP (8888)"
else
  PORT_8888="🔴 DOWN (8888)"
fi

# Check port 8789 (AmaJungle Dashboard)
if nc -zv localhost 8789 >/dev/null 2>&1; then
  PORT_8789="🟢 UP (8789)"
else
  PORT_8789="🔴 DOWN (8789)"
fi

# === RAPIDAPI QUOTAS ===
# Check for RapidAPI config (not currently configured)
RAPIDAPI_STATUS="Not configured"

# Business-focused quotes
QUOTES=(
    "Revenue solves known problems. - Jason Lemkin"
    "The best time to plant a tree was 20 years ago. The second best time is now."
    "Do things that don't scale. - Paul Graham"
    "Your most unhappy customers are your greatest source of learning. - Bill Gates"
    "Make every detail perfect and limit the number of details. - Jack Dorsey"
    "If you're not embarrassed by the first version, you've launched too late. - Reid Hoffman"
    "Action produces information. - Marc Andreessen"
    "Build something 100 people love, not something 1 million people kind of like. - Brian Chesky"
)
QUOTE_INDEX=$((RANDOM % ${#QUOTES[@]}))
TODAY_QUOTE="${QUOTES[$QUOTE_INDEX]}"

# Create report
{
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🌅 GOOD MORNING, AMAJUNGLE OPS! 🌅             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📅 $DATE | ⏰ $TIME"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌤️  WEATHER IN POB DALAGUETE, CEBU"
echo "    $WEATHER"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📧 ECHO AUDIT PIPELINE"
echo "    📨 Overnight emails: $OVERNIGHT_EMAILS"
echo "    📊 Total auto-sent: $TOTAL_AUTO_SENT"
echo "    ───────────────────────────"
echo "    T1 (General): $T1_COUNT  |  T2 (Sales): $T2_COUNT  |  T3 (Trans): $T3_COUNT"
echo "    ───────────────────────────"
echo "    📥 Queue pending: $QUEUE_COUNT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🤖 AGENT FLEET STATUS"
echo -e "$AGENT_STATUS" | sed 's/^/    /'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🖥️  DASHBOARD HEALTH"
echo "    $PORT_8888  |  $PORT_8789"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚡ RAPIDAPI QUOTAS"
echo "    $RAPIDAPI_STATUS"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💭 TODAY'S INSPIRATION"
echo "    $TODAY_QUOTE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 TODAY'S FOCUS"
echo "    • Monitor Echo audit queue"
echo "    • Check client follow-ups"
echo "    • Review dashboard health"
echo "    • Scale what works"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Have a productive day! 🚀"
echo ""
echo "— Allysa 🤖 (Fleet Orchestrator)"
echo ""
} > "$REPORT_FILE"

cat "$REPORT_FILE"
echo ""
echo "✅ Report saved to: $REPORT_FILE"
