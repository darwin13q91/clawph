---
name: quick-start-templates
description: Pre-filled examples and starting points for common tasks
---

## Template 1: First Client Audit (River)

**Trigger:** New audit request received via Echo

**Mode:** review-mining (Mode 2) + competitive-analysis (Mode 5)

**Workflow:**
1. Extract ASIN from store URL
2. Fetch product data via RapidAPI
3. Mine top 3 competitor reviews
4. Generate findings with specific data points
5. Handoff to Piper for email delivery

**Output Example:**
```json
{
  "store_url": "https://amazon.com/dp/B0XXXXXXX",
  "data_source": "RapidAPI",
  "overall_score": 62,
  "findings": [
    {"category": "Reviews", "issue": "Only 12 reviews (target: 25+)", "severity": "medium"},
    {"category": "Images", "issue": "3 product images (recommend 6-8)", "severity": "medium"}
  ],
  "recommendations": [
    "Launch review acquisition campaign",
    "Expand image gallery with lifestyle shots"
  ]
}
```

---

## Template 2: First Cold Outreach Sequence (Piper)

**Trigger:** New contact added to CRM (Cold stage)

**Sequence:** cold-outreach (Sequence 1)

**Day 0 — Value Lead:**
- Subject: "Quick question about [Store Name]"
- Body: Specific observation + 1 insight + soft CTA

**Day 3 — Follow-Up with Proof:**
- Subject: "Re: Quick question"
- Body: Case study result + reiterate offer

**Day 7 — Different Angle:**
- Subject: "The PPC problem most sellers miss"
- Body: New pain point + different hook

**Day 14 — Breakup:**
- Subject: "Should I close your file?"
- Body: Respectful close with easy out

---

## Template 3: Technical Support Response (Echo)

**Trigger:** Client reports technical issue

**Tier:** Tier 2 (informed reply, <30 min)

**Structure:**
1. Acknowledge frustration
2. Provide step-by-step troubleshooting
3. Offer escalation if unresolved

**Example:**
> Hi [Name],
> 
> Sorry to hear the bot stopped responding. Let's fix this:
> 
> 1. Send /start to the bot in Telegram
> 2. Check your machine is online (bot needs connection)
> 3. Restart the agent: [command]
> 
> If it's still not working after these steps, I'll escalate to our technical team immediately.
> 
> — Echo, Amajungle Support

---

## Template 4: Discovery Call Follow-Up (Piper)

**Trigger:** Call completed, prospect needs closing

**Mode:** hot-closing (Sequence 3)

**Same Day — Recap + Proposal:**
- Summary of pain points discussed
- Proposed solution with pricing
- CTA: Reply to confirm

**Day 2 — Objection Preempt:**
- Address likely concern (price/time/results)
- Social proof specific to that objection
- CTA: Ready to lock in?

**Day 5 — Urgency:**
- Founding pricing / limited spots
- CTA: Book before [date]

**Day 8 — Value Stack:**
- ROI math: hours saved × hourly rate
- Cost of inaction
- CTA: Final push

**Day 14 — Professional Close:**
- Respectful check-in
- Easy out option
- CTA: Decide now or defer

---

## Template 5: Weekly Agent Health Check (Allysa)

**Trigger:** Sunday, or manual request

**Checklist:**
- [ ] Echo: Inbox monitored, no stuck emails
- [ ] River: RapidAPI responding, real data flowing
- [ ] Piper: Sequences sending, CRM updated
- [ ] Atlas: Dashboards running, no errors
- [ ] Allysa: Decision log current, hit rate tracked

**Alert Format:**
🚨 [Agent]: [Observation]. [Recommendation].

---

## Template 6: Client Onboarding Kickoff (Piper)

**Trigger:** Payment received

**Sequence:** client-onboarding (Sequence 4)

**Day 0 — Welcome:**
- Confirm purchase
- Set expectations
- Next steps + timeline

**Day 1 — Onboarding:**
- Access details
- Telegram setup
- First automation walkthrough

**Day 3 — Check-in:**
- "How's the setup going?"
- Answer questions

**Day 7 — First Win:**
- Celebrate first automation success
- Hours saved highlight

**Day 14 — Progress Report:**
- Summary of automations running
- Value delivered

**Day 30 — Review Request:**
- Ask for testimonial
- Introduce upsell if relevant

---

## How to Use These Templates

1. **Copy the structure** for your specific scenario
2. **Customize fields** in [brackets]
3. **Follow the workflow** step-by-step
4. **Log the outcome** in decision-tracking

**Rule:** Templates are starting points — always personalize before sending.
