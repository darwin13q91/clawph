# Email Nurture System - Integration Guide

## 📦 What Was Created

### 1. Lead Magnet
- **File:** `/public/downloads/amazon-checklist.html`
- **URL:** `https://amajungle.com/downloads/amazon-checklist.html`
- **Description:** 12-point Amazon Pre-Launch Checklist with Amajungle branding

### 2. Email Nurture Sequence (7 Emails)
- **Location:** `/agents/piper/templates/nurture/`
- **Files:**
  - `01-welcome.md` - Day 0: Welcome + Checklist delivery
  - `02-value.md` - Day 1: Value/education email
  - `03-social-proof.md` - Day 3: Case study email
  - `04-objection-handler.md` - Day 5: Address "is this worth it?" objection
  - `05-urgency.md` - Day 7: Limited spots urgency
  - `06-last-chance.md` - Day 9: Final push
  - `07-breakup.md` - Day 14: Polite final email

### 3. Lead Capture Popup
- **File:** `/src/components/LeadMagnetPopup.tsx`
- **Features:**
  - Exit intent trigger (mouse leaves page top)
  - 30-second timer fallback
  - Glass card design with neon accents
  - Fields: Name, Email, Monthly Revenue
  - Cookie-based dismissal (7 days)
  - Pixel event tracking

### 4. Retargeting Pixels
- **Config:** `/src/config/pixels.ts`
- **Events Tracked:**
  - PageView
  - Lead (email capture)
  - InitiateCheckout (Calendly click)
  - LeadMagnetShown (popup displayed)

### 5. Lead Capture API
- **Config:** `/src/config/lead-capture-api.ts`
- **Endpoint:** `/api/lead-capture`
- **Integration:** Echo (hello@amajungle.com)

---

## 🚀 Activation Steps

### Step 1: Update Pixel IDs

Edit `/public/index.html` and replace:

```html
<!-- Facebook Pixel - Replace YOUR_PIXEL_ID -->
fbq('init', 'YOUR_PIXEL_ID');

<!-- Google Ads - Replace AW-YOUR_CONVERSION_ID -->
gtag('config', 'AW-YOUR_CONVERSION_ID');
```

Also update `/src/config/pixels.ts` with the same IDs.

### Step 2: Set Up Email Service

#### Option A: Resend (Recommended)
1. Sign up at https://resend.com
2. Add API key to environment variables:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   ```
3. Verify your domain (amajungle.com)

#### Option B: EmailJS (Client-side)
1. Sign up at https://www.emailjs.com
2. Create email template
3. Update `/src/config/lead-capture-api.ts`:
   ```typescript
   export const EMAILJS_CONFIG = {
     serviceId: 'your_service_id',
     templateId: 'your_template_id',
     publicKey: 'your_public_key',
   };
   ```

### Step 3: Create API Endpoint

Create `/api/lead-capture.ts` (Vercel) or configure your backend:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ... (see lead-capture-api.ts for full implementation)
}
```

### Step 4: Configure Echo Integration

Set up Echo to:
1. Receive lead notifications at hello@amajungle.com
2. Trigger Piper to start nurture sequence
3. Log leads in CRM

Example webhook payload:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "revenue": "10k-25k",
  "source": "lead_magnet_popup",
  "timestamp": "2026-03-14T10:00:00Z"
}
```

### Step 5: Deploy & Test

1. Deploy updated website:
   ```bash
   cd /home/darwin/.openclaw/amajungle
   npm run build
   # Deploy to Vercel/production
   ```

2. Test the popup:
   - Wait 30 seconds OR move mouse to top of page
   - Fill out form
   - Check email receives the checklist

3. Verify pixels with Facebook Pixel Helper Chrome extension

4. Test nurture sequence by submitting a test lead

---

## 📧 Email Sequence Schedule

| Day | Email | Purpose |
|-----|-------|---------|
| 0 | Welcome | Deliver PDF, introduce Amajungle, ask for reply |
| 1 | Value | Teach listing optimization, CTA: book audit |
| 3 | Social Proof | Case study, CTA: "Want results like this?" |
| 5 | Objection Handler | Address "is this worth it?" question |
| 7 | Urgency | Limited spots, 48hr expiration |
| 9 | Last Chance | Final push, "If not now, when?" |
| 14 | Breakup | Polite close, easy unsubscribe |

---

## 📊 Tracking & Analytics

### Facebook Pixel Events
- `PageView` - Every page load
- `Lead` - Email form submission
- `InitiateCheckout` - Calendly booking click
- `LeadMagnetShown` - Popup displayed

### Google Ads Events
- `page_view` - Page loads
- `generate_lead` - Form submission
- `begin_checkout` - Calendly click

### Custom Tracking
View tracking helper functions in `/src/config/pixels.ts`:
```typescript
import { trackLeadCapture, trackCalendlyInitiated } from './config/pixels';

// Use in components
trackLeadCapture();
trackCalendlyInitiated();
```

---

## 🎨 Customization

### Popup Timing
Edit in `/src/App.tsx`:
```jsx
<LeadMagnetPopup 
  delayMs={30000}      // Change timing (milliseconds)
  exitIntent={true}    // Enable/disable exit intent
  cookieDays={7}       // Days before showing again
/>
```

### Email Content
Edit files in `/agents/piper/templates/nurture/` to customize:
- Subject lines
- Body copy
- CTAs
- Personalization variables

### PDF Checklist
Edit `/public/downloads/amazon-checklist.html`:
- Update checklist items
- Change branding colors
- Add/remove sections

---

## 🔧 Troubleshooting

### Popup not showing?
- Check browser console for errors
- Clear cookies (look for `amajungle_leadmagnet_closed`)
- Verify component is imported in App.tsx

### Emails not sending?
- Verify API endpoint is configured
- Check Resend/EmailJS credentials
- Review spam folder for test emails

### Pixels not firing?
- Install Facebook Pixel Helper extension
- Check browser console for fbq/gtag errors
- Verify pixel IDs are correct

---

## 📁 File Summary

```
amajungle/
├── public/
│   └── downloads/
│       └── amazon-checklist.html    # Lead magnet document
├── src/
│   ├── components/
│   │   └── LeadMagnetPopup.tsx      # Popup component
│   ├── config/
│   │   ├── pixels.ts                # Pixel tracking config
│   │   └── lead-capture-api.ts      # API endpoint template
│   └── App.tsx                      # Updated with popup
├── index.html                       # Updated with pixel code
└── EMAIL_NURTURE_INTEGRATION.md     # This file

agents/piper/
└── templates/
    └── nurture/
        ├── 01-welcome.md
        ├── 02-value.md
        ├── 03-social-proof.md
        ├── 04-objection-handler.md
        ├── 05-urgency.md
        ├── 06-last-chance.md
        └── 07-breakup.md
```

---

## ✅ Post-Activation Checklist

- [ ] Pixel IDs updated in index.html
- [ ] Resend/EmailJS API keys configured
- [ ] API endpoint deployed and tested
- [ ] Echo integration receiving leads
- [ ] Popup displays correctly on website
- [ ] Form submission sends email with PDF
- [ ] Facebook Pixel Helper shows events firing
- [ ] Test lead entered nurture sequence
- [ ] CRM logging leads correctly
- [ ] Mobile responsive test passed

---

**Questions?** Contact Allysa at hello@amajungle.com
