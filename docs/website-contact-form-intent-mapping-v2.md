# Amajungle Contact Form — Intent Mapping (UPDATED March 10, 2026)
**Based on:** Actual amajungle.com form screenshot
**Purpose:** Dynamic responses based on dropdown + message content

---

## Current Form Structure

```
Name *               [__________]
Email *              [__________]
Phone                [__________]
Company              [__________]

Service Interested In *
  [Dropdown]
  - AI Automation Setup — $997
  - Amazon Growth Management — $999/mo
  - Brand Website Development — $1,497
  - Free Amazon Audit
  - Other / Not sure yet

[Send Message]
```

**Missing:** Message/Notes field for additional context

---

## PROPOSED: Dynamic Form with Message Field

### Option A: Simple Addition (Recommended)
Add a message textarea below the dropdown:

```
Tell us more about what you need (optional)
[________________________]
[________________________]
```

### Option B: Conditional Fields (Advanced)
Show different follow-up questions based on dropdown selection:

| If they select... | Show additional field |
|-------------------|----------------------|
| AI Automation Setup | "What tasks do you want to automate?" |
| Amazon Growth | "What's your current monthly revenue?" |
| Website Development | "Do you have an existing website?" |
| Free Audit | "Paste your Amazon store URL:" |
| Other | "Tell us what you're looking for:" |

---

## Dropdown → Intent Mapping

| Dropdown Value | Intent Code | Template Used | Response Focus |
|----------------|-------------|---------------|----------------|
| AI Automation Setup — $997 | `ai_automation` | T1_ai_focus | Telegram control, 5 automations, ownership |
| Amazon Growth Management — $999/mo | `amazon_growth` | T1_growth_focus | Full management, PPC, weekly calls |
| Brand Website Development — $1,497 | `website_dev` | T3_escalate_atlas | Escalate to Atlas + portfolio |
| Free Amazon Audit | `audit` | T2_audit_offer | Free 30-min audit, ASIN analysis |
| Other / Not sure yet | `other` | → Scan message | Keyword fallback |

---

## Email Format for Echo Detection

### Subject Line (Auto-generated)
```
New Lead: [intent_code] - [Name] from [Company]

Examples:
- "New Lead: ai_automation - Darwin from Estardo Inc"
- "New Lead: amazon_growth - John from ABC Store"
- "New Lead: audit - Sarah from XYZ Brand"
```

### Email Body
```
New Contact Form Submission

Name: Darwin Estardo
Email: darwin@example.com
Phone: +63 995 450 5206
Company: Estardo Inc
Service: ai_automation
Message: I want to automate my PPC monitoring and inventory alerts.

---
Sent from amajungle.com contact form
```

---

## Echo Detection Logic (UPDATED)

### Primary Detection: Service Field
```python
# Extract from subject: "New Lead: ai_automation - Darwin..."
match = re.search(r'New Lead:\s*(\w+)', subject)
intent = match.group(1)  # ai_automation, amazon_growth, etc.
```

### Secondary Detection: Message Content
If Service = "other" or message contains additional context:
```python
# Scan message for keywords
if 'bot' in message or 'automate' in message:
    intent = 'ai_automation'
elif 'PPC' in message or 'listings' in message:
    intent = 'amazon_growth'
elif 'website' in message or 'site' in message:
    intent = 'website_dev'
elif 'audit' in message or 'review' in message:
    intent = 'audit'
```

### Tertiary Detection: Company/Name Context
If still unclear, check if company name suggests Amazon seller:
- Contains "Store", "Brand", "Co" → Assume amazon_growth
- Contains "Agency", "Services" → Ask clarification

---

## Response Templates by Intent

### 1. AI Automation Setup — $997
```
Hey [Name],

Thanks for your interest in AI Automation!

Perfect for: Automating repetitive Amazon tasks (PPC monitoring, inventory alerts, review tracking, pricing adjustments).

What you get:
• Custom AI agent built for your workflow
• 5 automations configured
• Telegram control (works from your phone)
• Runs on your hardware (you own it completely)
• 48-hour setup
• 30-day money-back guarantee

Investment: $997 one-time (no monthly fees)

[Message-specific response if provided]
You mentioned: "[their message]" — yes, we can absolutely automate that.

Next step: Book a 30-minute audit where I'll review your current setup and show you exactly what we'd automate.

[Calendly link]
```

### 2. Amazon Growth Management — $999/mo
```
Hey [Name],

Thanks for your interest in Amazon Growth Management!

Perfect for: Sellers doing $10K+/mo who want to scale without hiring a full team.

What you get:
• Full listing optimization
• PPC campaign management
• Weekly performance reports
• Monthly strategy calls
• AI automation included
• First month 50% off ($499)

[Message-specific response if provided]
You mentioned: "[their message]" — that's exactly what we help with.

Next step: Book a discovery call to discuss your goals and see if we're a fit.

[Calendly link]
```

### 3. Brand Website Development — $1,497
```
Hey [Name],

Thanks for your interest in website development!

I'm connecting you with Atlas, our lead developer, who will reach out within 24 hours to discuss your project.

To prepare, he'll want to know:
• Do you have an existing website?
• What's the primary goal? (leads, sales, portfolio)
• Any design references you like?

Feel free to reply here with those details and I'll pass them along.

— The Amajungle Team
```

### 4. Free Amazon Audit
```
Hey [Name],

Thanks for requesting a free Amazon audit!

During our 30-minute call, I'll:
• Review your current listings and PPC
• Identify your biggest opportunities
• Show you what an AI agent would automate for your store
• Give you actionable recommendations (even if you don't buy)

If you have a specific ASIN or store URL, reply with it and I'll come prepared.

Book here: [Calendly link]

Or reply with 2-3 times that work for you.
```

### 5. Other / Not sure yet
```
Hey [Name],

Thanks for reaching out!

To point you in the right direction, can you tell me:

1. Are you selling on Amazon already, or just getting started?
2. What's your biggest headache right now — PPC, inventory, reviews, or something else?
3. Are you looking for DIY tools or done-for-you service?

Once I know that, I can recommend the right solution.

[If they wrote a message]
You also mentioned: "[their message]"
```

---

## Dynamic Message Field (NEW)

### HTML Addition
```html
<div class="form-group">
  <label for="message">Tell us more about what you need (optional)</label>
  <textarea 
    id="message" 
    name="message" 
    rows="4" 
    placeholder="Example: I spend 10 hours a week on PPC and inventory..."
  ></textarea>
</div>
```

### Why This Matters
1. **Qualification:** Know if they're serious vs. browsing
2. **Personalization:** Reference their specific pain point
3. **Routing:** Message content can override dropdown if mismatched
4. **Conversion:** Shows you actually read their submission

---

## Implementation for Atlas

### Files to Update
1. `amajungle.com` contact form component
2. Form submission handler (Formspree/Netlify/Custom)
3. Email template to include `Service:` and `Message:` fields

### Email Template (Form Handler)
```
Subject: New Lead: {{service}} - {{name}} from {{company}}

Name: {{name}}
Email: {{email}}
Phone: {{phone}}
Company: {{company}}
Service: {{service}}
Message: {{message}}

---
Sent from amajungle.com contact form
```

---

## Testing Checklist

- [ ] Form renders with new message field
- [ ] Dropdown values map to correct intents
- [ ] Email subject includes intent code
- [ ] Echo detects intent and sends correct template
- [ ] Message content is referenced in response
- [ ] "Other" selection triggers keyword scan
- [ ] Mobile responsive

---

## Files Updated

- `/docs/website-contact-form-intent-dropdown.md` ← This file
- `/agents/echo/scripts/echo_monitor.py` ← Detection logic
- `/agents/echo/SOUL.md` ← Intent mapping

---

*Updated: March 10, 2026*  
*Owner: Atlas (website) + Echo (responses)*
