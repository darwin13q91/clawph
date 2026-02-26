#!/bin/bash
# 6AM Morning Report for Darwin

WORKSPACE="/home/darwin/.openclaw/workspace"
DATA_DIR="/home/darwin/.openclaw/data"
REPORT_FILE="$DATA_DIR/morning_report.txt"
DATE=$(date +"%A, %B %d, %Y")

echo "Generating morning report for $DATE..."

# Create quotes file
mkdir -p "$WORKSPACE/personal/data"
QUOTES_FILE="$WORKSPACE/personal/data/quotes.txt"

if [ ! -f "$QUOTES_FILE" ]; then
cat > "$QUOTES_FILE" <> 'QUOTESEND'
The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt
Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill
The only way to do great work is to love what you do. - Steve Jobs
Believe you can and you are halfway there. - Theodore Roosevelt
Every day is a new beginning. Take a deep breath and start again.
The best time to plant a tree was 20 years ago. The second best time is now.
Do not watch the clock; do what it does. Keep going. - Sam Levenson
Everything you have ever wanted is on the other side of fear.
It always seems impossible until it is done. - Nelson Mandela
The way to get started is to quit talking and begin doing. - Walt Disney
Small progress is still progress.
Dream big and dare to fail.
What we think, we become. - Buddha
QUOTESEND
fi

# Get random quote
TODAY_QUOTE=$(shuf -n 1 "$QUOTES_FILE" 2>/dev/null || echo "Believe in yourself!")

# Get weather
WEATHER=$(curl -s "wttr.in/Poblacion,Dalaguete,Cebu?format=%C+%t" 2>/dev/null || echo "Clear +27°C")

# Get trading stats
TRADING_STATS="No trades yet"
if [ -f "$DATA_DIR/paper_trades.json" ]; then
    TRADING_STATS=$(python3 -c "
import json
try:
    with open('$DATA_DIR/paper_trades.json') as f:
        trades = json.load(f)
    total = len(trades)
    open_pos = len([t for t in trades if t.get('status') == 'OPEN'])
    closed = [t for t in trades if t.get('status') == 'CLOSED']
    if closed:
        wins = len([t for t in closed if t.get('pnl', 0) > 0])
        win_rate = round((wins / len(closed)) * 100, 1) if closed else 0
        pnl = round(sum(t.get('pnl', 0) for t in closed), 2)
        print(f'{total} total, {open_pos} open, {win_rate}% wins, ${pnl} PnL')
    else:
        print(f'{total} total, {open_pos} open')
except Exception as e:
    print('Error reading trades')
" 2>/dev/null)
fi

# Count today's auto-trades
TODAY_TRADES=0
if [ -f "$DATA_DIR/auto_trading.log" ]; then
    TODAY=$(date +%Y-%m-%d)
    TODAY_TRADES=$(grep "$TODAY" "$DATA_DIR/auto_trading.log" 2>/dev/null | grep -c "PAPER TRADE" || echo "0")
fi

# Create report
echo "GOOD MORNING, DARWIN!" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "📅 $DATE" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "═══════════════════════════════════════" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "🌤️ WEATHER IN POB DALAGUETE, CEBU" >> "$REPORT_FILE"
echo "$WEATHER" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "═══════════════════════════════════════" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "💭 TODAY'S INSPIRATION" >> "$REPORT_FILE"
echo "$TODAY_QUOTE" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "═══════════════════════════════════════" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "📊 PAPER TRADING SUMMARY" >> "$REPORT_FILE"
echo "$TRADING_STATS" >> "$REPORT_FILE"
echo "🤖 Auto-trades today: $TODAY_TRADES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "═══════════════════════════════════════" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "⚠️  REMEMBER: This is PAPER TRADING (simulated)" >> "$REPORT_FILE"
echo "No real money at risk. Prove your edge first!" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "═══════════════════════════════════════" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "🎯 TODAY'S FOCUS" >> "$REPORT_FILE"
echo "• Review yesterday's trades" >> "$REPORT_FILE"
echo "• Check market opportunities" >> "$REPORT_FILE"
echo "• Learn from wins/losses" >> "$REPORT_FILE"
echo "• Stay disciplined!" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Have a productive day! 🚀" >> "$REPORT_FILE"

# Display report
cat "$REPORT_FILE"

echo ""
echo "Report saved to: $REPORT_FILE"
