# Echo Configuration — March 6, 2026

**Status:** Production Ready  
**Location:** `/home/darwin/.openclaw/agents/echo/`  
**Monitored Accounts:** hello@, support@, ops@amajungle.com  
**Check Interval:** 5 minutes (cron)

## File Structure
```
/home/darwin/.openclaw/agents/echo/
├── SOUL.md              # 824 lines - Complete support agent personality
├── README.md            # Quick reference
├── data/
│   ├── signature.html   # Dark green Amajungle HTML signature
│   ├── queue/           # Pending replies awaiting approval
│   ├── sent/            # Sent email records
│   └── echo_monitor.log # IMAP check logs
└── scripts/
    ├── echo_monitor.py  # IMAP inbox checker
    └── echo_reply.py    # Queue manager & sender
```

## How It Works

1. **Monitor** (`echo_monitor.py` via cron every 5 min):
   - Checks hello@, support@, ops@ for UNSEEN emails
   - Classifies: Tier 1 (auto), Tier 2 (draft), Tier 3 (escalate)
   - Drafts replies using templates
   - Queues to `data/queue/` as JSON files

2. **Reply** (`echo_reply.py`):
   - Lists queued emails awaiting approval
   - Sends with HTML signature from `signature.html`
   - Moves sent emails to `data/sent/`

## Templates (Body Only - No Signatures)

Templates end with content only. Signatures added automatically on send.

| ID | Name | Use Case |
|----|------|----------|
| T1 | General Inquiry | New prospect reaching out |
| T2 | Pricing | "How much?" questions |
| T3 | Calendly | Scheduling issues |
| T4 | Cancellation | Tier 3 escalation acknowledgment |
| T5 | Positive | Thank you responses |
| T6 | Comparison | "How are you different?" |
| T7 | After-Hours | Auto-reply outside business hours |
| T8 | Objection | "Too expensive" handling |

## Email Signature

**Location:** `/agents/echo/data/signature.html`

**Design:**
- Dark green background (#0B3A2C)
- Lime green accents (#CFFF00)
- Logo: amajungle.com/images/logo-icon.png
- Name: Allysa Kate Estardo
- Title: Founder, amajungle
- Contact: hello@amajungle.com, +63 0995 450 5206
- CTA: "Book Free Audit →" button

## Usage

```bash
# Check inbox and queue replies
cd /home/darwin/.openclaw/agents/echo && python3 scripts/echo_monitor.py

# List queued emails
cd /home/darwin/.openclaw/agents/echo && python3 scripts/echo_reply.py list

# View specific reply
cd /home/darwin/.openclaw/agents/echo && python3 scripts/echo_reply.py view <queue_id>

# Approve and send
cd /home/darwin/.openclaw/agents/echo && python3 scripts/echo_reply.py approve <queue_id>

# Approve all (careful!)
echo "yes" | cd /home/darwin/.openclaw/agents/echo && python3 scripts/echo_reply.py approve-all
```

## Cron Setup

```cron
# Check inbox every 5 minutes
*/5 * * * * cd /agents/echo && python3 scripts/echo_monitor.py >> data/echo_monitor.log 2>&1
```

## Recent Fixes (March 6)

1. ✅ Removed duplicate signatures from templates
2. ✅ Centralized HTML signature in `signature.html`
3. ✅ Updated `echo_reply.py` to load signature from file
4. ✅ Updated `send_privateemail.py` to use same signature
5. ✅ Agent moved from `/workspace/agents/echo/` to `/agents/echo/`

## Related Files

- `/home/darwin/.openclaw/scripts/send_privateemail.py` — General email sending
- `/home/darwin/.openclaw/workspace/skills/email-outreach/` — B2B campaign system
- `/home/darwin/.openclaw/.env` — Email credentials (HELLO_PASS, SUPPORT_PASS, OPS_PASS)
