# EmailJS Template Configuration Notes

## Template ID: template_yhii41g

### Subject Line Configuration
Set the email subject to use the `subject` variable:
```
{{subject}}
```

This will render as: `New Lead: ai_automation - John Smith from Acme Inc`

### Email Body Configuration
Configure the email body template as follows:

```
New Contact Form Submission

Name: {{from_name}}
Email: {{from_email}}
Phone: {{phone}}
Company: {{company}}
Service: {{service}}
Message: {{message}}

---
Sent from amajungle.com contact form
```

### Field Mappings (from form)
- `from_name` - User's name
- `from_email` - User's email address
- `phone` - Phone number (defaults to "Not provided" if empty)
- `company` - Company name (defaults to "Not provided" if empty)
- `service` - Selected service intent code:
  - `ai_automation` - AI Automation Setup — $997
  - `amazon_growth` - Amazon Growth Management — $999/mo
  - `website_dev` - Brand Website Development — $1,497
  - `audit` - Free Amazon Audit
  - `other` - Other / Not sure yet
- `message` - Additional message (defaults to "No additional message provided" if empty)
- `subject` - Auto-generated subject line

## Form Changes Summary

### File Modified: `/home/darwin/.openclaw/amajungle/src/sections/ContactSection.tsx`

1. **Service Dropdown Updated:**
   - Now uses intent codes as values (ai_automation, amazon_growth, website_dev, audit, other)
   - Made required field

2. **Message Field Updated:**
   - Label: "Tell us more about what you need (optional)"
   - Placeholder: "Example: I spend 10 hours a week on PPC monitoring and inventory tracking..."
   - Changed from required to optional

3. **Email Subject Formatting:**
   - Subject line now formatted as: "New Lead: {service} - {name} from {company}"
   - Passed to EmailJS template as `subject` variable

## Mobile Responsiveness
- Form uses Tailwind responsive classes:
  - `grid-cols-1 sm:grid-cols-2` for phone/company fields
  - `lg:grid-cols-2` for two-column layout on desktop
  - `px-6` padding scales appropriately
  - Textareas and inputs are full-width on all screen sizes
