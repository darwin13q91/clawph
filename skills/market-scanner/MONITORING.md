# How to Monitor Your Self-Improving Trading Bot

## 🖥️ **Dashboard Views**

### **1. Quick Status Check**
```bash
python3 ~/.openclaw/workspace/skills/market-scanner/monitor_evolution.py
```
Shows: Overall stats, evolved strategies, patterns, next evolution

### **2. Live Monitoring (Auto-refresh)**
```bash
python3 ~/.openclaw/workspace/skills/market-scanner/monitor_evolution.py --watch
```
Refreshes every 30 seconds. Press Ctrl+C to exit.

### **3. Web Dashboard**
Visit: http://127.0.0.1:8789 → "Trading" tab

---

## 📱 **Telegram Alerts**

You'll get alerts when:
- 🚀 Strategy promoted to LIVE
- 🗑️ Strategy retired (poor performance)
- 🧬 New strategy created
- 📊 Weekly evolution complete

---

## 📊 **Key Metrics to Watch**

| Metric | Good | Bad | Action |
|--------|------|-----|--------|
| **Win Rate** | >55% | <45% | Review strategy |
| **Test Trades** | 10+ | <5 | Wait for more data |
| **Evolved Strategies** | 2-3 | 0 | Run evolution |
| **Live Strategies** | 1+ | 0 | Promote winners |

---

## 🎯 **When to Take Action**

### **Strategy Promoted to LIVE** 🚀
✅ Good! It's performing well. It will now trade with real position sizes.

### **Strategy Retired** 🗑️
⚠️ Normal. Not all strategies work. The bot learned and moved on.

### **No Closed Trades**
⏳ Patience. Wait for markets to resolve and trades to close.

### **Evolution Not Running**
🔧 Check: `crontab -l | grep evolution`
Should show: `0 21 * * 0 ... run_evolution.sh`

---

## 🔧 **Manual Commands**

### **Force Evolution Now**
```bash
cd ~/.openclaw/workspace/skills/market-scanner
python3 strategy_evolution.py
```

### **Check All Strategies**
```bash
cat ~/.openclaw/workspace/data/evolved_strategies.json | python3 -m json.tool
```

### **View Evolution Log**
```bash
tail -f ~/.openclaw/data/evolution.log
```

### **Reset Testing Strategy**
```bash
# Only if you want to start fresh
rm ~/.openclaw/data/evolved_strategies.json
```

---

## 📅 **Timeline**

| Time | What Happens |
|------|--------------|
| **Now** | Bot created, waiting for trade data |
| **Daily 8AM-10PM** | Trading executes |
| **Sunday 9PM** | Evolution cycle runs |
| **After 10 trades** | Strategy evaluated |
| **Win rate ≥55%** | Strategy promoted to LIVE |
| **Win rate <50%** | Strategy retired |

---

## 💡 **Pro Tips**

1. **Check monitor once daily** - Don't obsess over real-time
2. **Wait for 10+ closed trades** - Before judging performance
3. **Let it run 4+ weeks** - Evolution needs time to learn
4. **Compare to original strategies** - Are evolved ones better?
5. **Review weekly** - Sunday evenings check what evolved

---

## 🚨 **Troubleshooting**

### **"No closed trades"**
Normal! Wait for markets to close your positions.

### **"Evolution failed"**
Check logs: `cat ~/.openclaw/data/evolution.log`

### **"Strategies not promoting"**
Need 10+ test trades AND 55%+ win rate.

---

**Your bot is now self-aware and learning! 🧬🚀**
