# Amajungle Contact Form — Intent Dropdown Specification
**Date:** March 10, 2026  
**Purpose:** Enable intent-based dynamic responses from Echo

---

## Form Field Specification

### Field Name
`interest` or `topic` (sent to email as "Interest: [value]")

### Field Label
**"What can we help you with?"**

### Field Type
Dropdown (select menu)

### Options (in order)

| Display Text | Value (sent in email) | Maps To Intent |
|--------------|----------------------|----------------|
| Pricing / Cost | `pricing` | pricing_inquiry |
| Demo / See how it works | `demo` | demo_request |
| AI Automation Setup | `ai_automation` | ai_automation |
| Amazon Growth Management | `amazon_growth` | amazon_growth |
| Technical Support | `support` | tech_support |
| Partnership / Collaboration | `partnership` | partnership |
| Cancellation / Refund | `cancellation` | retention_risk |
| General Question | `general` | general |
| Other (please specify) | `other` | other → triggers keyword fallback |

---

## Email Format Requirements

The form submission email MUST include the dropdown value in a detectable format:

### Option A: Subject Line (Recommended)
```
Subject: New Contact Form Submission: [VALUE]

Examples:
- "New Contact Form Submission: pricing"
- "New Contact Form Submission: demo"
- "New Contact Form Submission: support"
```

### Option B: Email Body Header
```
New Contact Form Submission

Name: [Name]
Email: [Email]
Interest: [VALUE]  ← Echo reads this line
Message: [Message]
```

### Option C: Both (Best)
Include in subject AND body for redundancy.

---

## Implementation Notes

### For Static HTML Form
```html
<label for="interest">What can we help you with?</label>
<select name="interest" id="interest" required>
  <option value="">-- Select --</option>
  <option value="pricing">Pricing / Cost</option>
  <option value="demo">Demo / See how it works</option>
  <option value="ai_automation">AI Automation Setup</option>
  <option value="amazon_growth">Amazon Growth Management</option>
  <option value="support">Technical Support</option>
  <option value="partnership">Partnership / Collaboration</option>
  <option value="cancellation">Cancellation / Refund</option>
  <option value="general">General Question</option>
  <option value="other">Other (please specify)</option>
</select>
```

### For React/Vue Component
```jsx
const interestOptions = [
  { value: '', label: '-- Select --' },
  { value: 'pricing', label: 'Pricing / Cost' },
  { value: 'demo', label: 'Demo / See how it works' },
  { value: 'ai_automation', label: 'AI Automation Setup' },
  { value: 'amazon_growth', label: 'Amazon Growth Management' },
  { value: 'support', label: 'Technical Support' },
  { value: 'partnership', label: 'Partnership / Collaboration' },
  { value: 'cancellation', label: 'Cancellation / Refund' },
  { value: 'general', label: 'General Question' },
  { value: 'other', label: 'Other (please specify)' }
];
```

### Email Template (Formspree/Netlify/etc.)
```
Subject: New Contact Form Submission: {{interest}}

Name: {{name}}
Email: {{email}}
Interest: {{interest}}
Message: {{message}}

---
This email was sent from the contact form on amajungle.com
```

---

## Echo Detection Pattern

Echo uses this regex to extract intent:

```python
# From subject line
subject_intent = re.search(r'Contact Form Submission: (\w+)', subject)

# From body
body_intent = re.search(r'Interest:\s*(\w+)', body)

# Priority: subject > body > fallback keywords
```

---

## Testing Checklist

- [ ] Form renders correctly on mobile/desktop
- [ ] Dropdown includes all 9 options
- [ ] Email subject includes intent value
- [ ] Email body includes intent value
- [ ] Echo detects intent and sends correct template
- [ ] "Other" option triggers keyword fallback

---

## Related Files

- Echo SOUL.md: Intent detection protocol
- Echo templates: T1-General, T2-Pricing, T2-Audit-Offer, T3-Technical, etc.
- Memory: `/memory/agents/decisions/` tracks intent accuracy

---

*Implemented: March 10, 2026*  
*Owner: Atlas (website) + Echo (email handling)*
