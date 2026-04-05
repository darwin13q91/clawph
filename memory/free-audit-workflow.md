# Free Audit Workflow — Multi-Agent Process

**Date:** March 6, 2026  
**Status:** Active Workflow

## Overview
When a client requests a **free audit** with their **Amazon store URL**, a multi-agent process is triggered.

## Workflow Steps

### 1. Client Submits Contact Form
- **Form Type:** Free Audit Request
- **Required Fields:** Name, Email, Store URL
- **Submitted To:** hello@amajungle.com

### 2. Echo Detects & Triggers (Automated)
- Echo monitors inbox every 5 minutes
- Detects "Free Audit" + Store URL in form submission
- **Spawns River** for store analysis
- **Notifies Allysa** (master) via Telegram

### 3. River Analyzes Store (Spawned by Echo)
- Receives store URL from Echo
- Performs Amazon store analysis:
  - Listing quality
  - SEO optimization
  - Pricing analysis
  - Review metrics
  - Competitive positioning
- **Generates analysis report**
- **Returns findings to Echo**

### 4. Echo Drafts Personalized Email
- Receives River's analysis
- Drafts personalized email with:
  - Specific findings from River
  - Custom recommendations
  - Tailored audit offer
- **Sends email to client**
- **Logs to sent folder**

### 5. Allysa Notifies User (You)
- Receives notification from Echo/River
- Sends Telegram message with:
  - Client info
  - Store URL
  - Analysis summary
  - Email sent confirmation

## Agent Communication Protocol

```
Client Form
    ↓
[Echo] — Detects Audit Request + URL
    ↓
[Echo] Spawns [River] with URL
    ↓
[River] Analyzes Store → Returns Report
    ↓
[Echo] Drafts Email → Sends to Client
    ↓
[Echo] Reports to [Allysa]
    ↓
[Allysa] Notifies You via Telegram
```

## Implementation Files

### Echo Modifications
- **File:** `/agents/echo/scripts/echo_monitor.py`
- **Add:** Detection logic for "Free Audit" + URL
- **Add:** River spawn logic
- **Add:** Receive analysis from River
- **Add:** Personalized email drafting

### River Modifications
- **File:** `/agents/river/scripts/store_analyzer.py` (new)
- **Add:** Accept URL as parameter
- **Add:** Perform analysis
- **Add:** Return structured report

### Allysa Notifications
- **File:** Master agent notification system
- **Add:** Receive completion reports
- **Add:** Send Telegram summary

## Trigger Conditions

Echo will spawn River when:
1. Email is from contact form
2. Subject contains "Free Audit" OR "Audit Request"
3. Body contains Amazon store URL (amazon.com, amzn.to, etc.)
4. All required fields present

## Example Client Flow

1. **Client fills form:**
   - Name: John Smith
   - Email: john@example.com
   - Store: https://amazon.com/stores/LittleHotties
   - Request: Free Audit

2. **Echo detects:** Free Audit + Store URL

3. **Echo spawns River** with URL

4. **River analyzes:**
   - Finds: Poor SEO, missing keywords
   - Finds: Pricing 15% above competitors
   - Finds: Review response rate 23%

5. **Echo drafts email:**
   ```
   Hi John,
   
   Thanks for your audit request! I analyzed your LittleHotties store:
   
   🔍 Key Findings:
   • SEO: Missing key search terms in titles
   • Pricing: 15% above market average
   • Reviews: Response rate at 23% (should be 80%+)
   
   📊 Our AI can help:
   • Auto-optimize listings for search
   • Dynamic pricing adjustments
   • Automated review responses
   
   Let's schedule your 15-min call to discuss:
   https://calendly.com/amajungle/15min
   
   — Allysa Kate, Amajungle
   ```

6. **Allysa notifies you:**
   ```
   📧 Free Audit Completed
   
   Client: John Smith (john@example.com)
   Store: LittleHotties
   Analysis: SEO poor, pricing high, reviews need work
   Email: Sent with personalized recommendations
   ```

## Status: PENDING IMPLEMENTATION

**Next Steps:**
1. Modify Echo to detect audit requests
2. Create River store analyzer
3. Set up inter-agent communication
4. Configure Allysa notifications
5. Test full workflow

---
*Workflow designed: March 6, 2026*  
*To be implemented by: Atlas*
