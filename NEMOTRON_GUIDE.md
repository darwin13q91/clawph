# Nemotron 3 Super Integration Guide
# Location: ~/.openclaw/workspace/NEMOTRON_GUIDE.md

## Quick Reference

### Start Nemotron
```bash
# Check if running
curl http://localhost:11434/api/tags

# If not running:
sudo systemctl start ollama
```

### Basic Usage
```bash
# Interactive chat
ollama run nemotron-3-super:cloud

# Single prompt
ollama run nemotron-3-super:cloud "Your prompt here"

# With system context
ollama run nemotron-3-super:cloud --system "You are an expert" "Question"
```

### API Usage
```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nemotron-3-super:cloud",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.7
  }'
```

---

## Agent-Specific Tools

### Atlas (Infrastructure)
**Script:** `~/.openclaw/agents/atlas/scripts/log_analyzer.py`

```bash
# Analyze service logs
python3 ~/.openclaw/agents/atlas/scripts/log_analyzer.py \
    --service "nginx" \
    --log /var/log/nginx/error.log \
    --alert

# Returns: Critical issues, warnings, recommendations, health score
```

**When to use:**
- Daily log reviews
- Incident post-mortems
- System health checks
- Pattern detection in logs

---

### Scout (Web Research)
**Script:** `~/.openclaw/agents/scout/scripts/web_research.py`

```bash
# Summarize web content
curl -s https://example.com/article | \
    python3 ~/.openclaw/agents/scout/scripts/web_research.py summarize

# Extract data
curl -s https://example.com/products | \
    python3 ~/.openclaw/agents/scout/scripts/web_research.py extract "prices"

# Answer questions based on content
cat article.txt | \
    python3 -c "
import sys
from web_research import ScoutResearcher
scout = ScoutResearcher()
print(scout.answer_question(sys.stdin.read(), 'What are the main points?'))
"
```

**When to use:**
- Competitor research
- Content summarization
- Data extraction
- Quick fact-checking

---

### Echo (Email)
**Script:** `~/.openclaw/agents/echo/scripts/email_triage_nemotron.py`

```bash
# Test classification
python3 ~/.openclaw/agents/echo/scripts/email_triage_nemotron.py --test

# Use in Python
from email_triage_nemotron import EmailTriageAI
triage = EmailTriageAI()
result = triage.classify_email(
    subject="Server down",
    body="Production server is not responding...",
    sender="ops@company.com"
)
# Returns: category, priority, sentiment, suggested_action, draft_reply
```

**When to use:**
- Email classification (T1/T2/T3/T4)
- Draft replies
- Sentiment analysis
- Batch processing

---

## Model Comparison

| Task | Kimi K2.5 | Nemotron 3 Super |
|------|-----------|------------------|
| Complex reasoning | ✅ Best | ⚠️ Good |
| Long context (1M+) | ⚠️ Limited | ✅ Best |
| Speed | ⚠️ Slower | ✅ Fast |
| Cost | 💰 Paid | ✅ Free |
| Code generation | ✅ Best | ⚠️ Good |
| Log analysis | ⚠️ Okay | ✅ Best |
| Summarization | ✅ Good | ✅ Best |

---

## Best Practices

### 1. Use Nemotron for:
- ✅ Large document analysis (1M context)
- ✅ Daily log reviews
- ✅ Repetitive email tasks
- ✅ Web scraping & extraction
- ✅ Simple Q&A on large datasets
- ✅ Cost-sensitive operations

### 2. Use Kimi for:
- ✅ Complex problem-solving
- ✅ Strategy & planning
- ✅ Code review & debugging
- ✅ Creative writing
- ✅ Multi-step reasoning
- ✅ When accuracy is critical

### 3. Hybrid Workflows:
```python
# Example: Atlas analyzes logs with Nemotron,
# then Kimi decides action

# Step 1: Nemotron extracts patterns from 10,000 log lines
analysis = nemotron.analyze_logs(logs)

# Step 2: Kimi decides remediation strategy
strategy = kimi.decide_strategy(analysis)
```

---

## Troubleshooting

### "Connection refused"
```bash
# Check if Ollama is running
sudo systemctl status ollama

# Start it
sudo systemctl start ollama
```

### "Model not found"
```bash
# List available models
ollama list

# Pull if needed (not for cloud models)
ollama pull nemotron-3-super:cloud
```

### "Not authenticated"
```bash
# Re-authenticate
ollama login
# Then open the URL in browser
```

---

## Performance Tips

1. **Temperature**: Use 0.2-0.3 for factual tasks, 0.7-0.8 for creative
2. **Max tokens**: Set appropriately (e.g., 1024 for summaries, 4096 for analysis)
3. **Context**: Nemotron handles 1M tokens - use it for large inputs
4. **Streaming**: For long outputs, use streaming to see progress

---

## Monitoring Usage

```bash
# Check Nemotron availability
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# Monitor response times
time ollama run nemotron-3-super:cloud "Test"

# View logs
sudo journalctl -u ollama -f
```

---

*Last Updated: March 19, 2026*
