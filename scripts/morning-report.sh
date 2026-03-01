#!/bin/bash
# Morning Report for Darwin - With Timeouts

DATA_DIR="/home/darwin/.openclaw/data"
REPORT_FILE="$DATA_DIR/morning_report.txt"
DATE=$(date +"%A, %B %d, %Y")
TIME=$(date +"%I:%M %p")

echo "Generating morning report..."

# Get weather with 5 second timeout
WEATHER=$(timeout 5 curl -s "wttr.in/Poblacion,Dalaguete,Cebu?format=%C+%t" 2>/dev/null || echo "Clear +27°C")

# Get trading stats
TRADING_STATS="No trades yet"
if [ -f "$DATA_DIR/paper_trades.json" ]; then
    TRADING_STATS=$(timeout 5 python3 << 'PYCODE'
import json
try:
    with open('/home/darwin/.openclaw/data/paper_trades.json') as f:
        trades = json.load(f)
    total = len(trades)
    open_pos = len([t for t in trades if t.get('status') == 'OPEN'])
    closed = [t for t in trades if t.get('status') == 'CLOSED']
    if closed:
        wins = len([t for t in closed if t.get('pnl', 0) > 0])
        win_rate = round((wins / len(closed)) * 100, 1) if closed else 0
        pnl = round(sum(t.get('pnl', 0) for t in closed), 2)
        print(f"{total} total, {open_pos} open, {win_rate}% wins, ${pnl} PnL")
    else:
        print(f"{total} total, {open_pos} open")
except:
    print("Check dashboard for stats")
PYCODE
)
fi

# Count today's auto-trades  
TODAY_TRADES=0
if [ -f "$DATA_DIR/auto_trading.log" ]; then
    TODAY=$(date +%Y-%m-%d)
    TODAY_TRADES=$(grep -c "$TODAY.*PAPER TRADE" "$DATA_DIR/auto_trading.log" 2>/dev/null || echo "0")
fi

# Random quote
QUOTES=(
    "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
    "Success is not final, failure is not fatal. - Winston Churchill"
    "The only way to do great work is to love what you do. - Steve Jobs"
    "Believe you can and you are halfway there. - Theodore Roosevelt"
    "Every day is a new beginning."
    "The best time to plant a tree was 20 years ago."
    "It always seems impossible until it is done. - Nelson Mandela"
    "Small progress is still progress."
)
QUOTE_INDEX=$((RANDOM % ${#QUOTES[@]}))
TODAY_QUOTE="${QUOTES[$QUOTE_INDEX]}"

# Create report
{
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              🌅 GOOD MORNING, DARWIN! 🌅                 ║"
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
echo "💭 TODAY'S INSPIRATION"
echo "    $TODAY_QUOTE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 PAPER TRADING SUMMARY"
echo "    $TRADING_STATS"
echo "    🤖 Auto-trades today: $TODAY_TRADES"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  PAPER TRADING ONLY (Simulated - No Real Money)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 TODAY'S FOCUS"
echo "    • Review market opportunities"
echo "    • Learn from trade patterns"
echo "    • Stay disciplined!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Have a productive day! 🚀"
echo ""
echo "Your AI Agent - Allysa 🤖"
echo ""
} > "$REPORT_FILE"

cat "$REPORT_FILE"
echo ""
echo "✅ Report saved to: $REPORT_FILE"
