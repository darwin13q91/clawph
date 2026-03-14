/**
 * Lead Capture API Endpoint
 * 
 * This endpoint receives lead data from the LeadMagnetPopup
 * and forwards it to Echo (hello@amajungle.com) to trigger the nurture sequence
 * 
 * Save this as: /api/lead-capture.ts (for Vercel) or configure in your backend
 */

export interface LeadCaptureData {
  name: string;
  email: string;
  revenue: string;
  source: string;
  timestamp: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * Example Vercel Serverless Function
 * Create this file at: /api/lead-capture.ts
 */

/*
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, revenue, source, timestamp }: LeadCaptureData = req.body;

    // Validate required fields
    if (!name || !email || !revenue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Send notification to Echo (hello@amajungle.com)
    await resend.emails.send({
      from: 'Amajungle Leads <leads@amajungle.com>',
      to: 'hello@amajungle.com',
      subject: `New Lead: ${name} - ${revenue}/month`,
      html: `
        <h2>New Lead Magnet Download</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Monthly Revenue:</strong> ${revenue}</p>
        <p><strong>Source:</strong> ${source}</p>
        <p><strong>Captured:</strong> ${timestamp}</p>
        <hr>
        <p>Reply to start nurture sequence: Day 0 email</p>
      `,
    });

    // 2. Send welcome email with checklist to lead
    await resend.emails.send({
      from: 'Allysa Kate <allysa@amajungle.com>',
      to: email,
      subject: "Your Amazon Seller's Checklist + one quick win",
      html: generateWelcomeEmail(name),
      attachments: [
        {
          filename: 'amazon-sellers-pre-launch-checklist.pdf',
          path: 'https://amajungle.com/downloads/amazon-checklist.pdf',
        },
      ],
    });

    // 3. Log to CRM (optional - integrate with your CRM)
    // await logToCRM({ name, email, revenue, source, timestamp });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Lead capture error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateWelcomeEmail(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Amazon Checklist</title>
    </head>
    <body style="font-family: Inter, sans-serif; line-height: 1.6; color: #0B3A2C;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #0B3A2C;">Hey ${name},</h1>
        
        <p>Thanks for grabbing the Amazon Seller's Pre-Launch Checklist.</p>
        
        <p><strong>Your download is attached.</strong></p>
        
        <p>This checklist covers the 12 critical checkpoints that separate sellers who launch to crickets from sellers who hit the ground running. Most sellers skip #7 — and it costs them later.</p>
        
        <h3>Quick win you can implement today:</h3>
        <p>Open your best-selling ASIN. Look at your main image. Does it show the product IN USE? Can you read the key feature at thumbnail size?</p>
        
        <p>Most Amazon sellers lose 20-30% of potential clicks because their main image looks like a catalog shot.</p>
        
        <p><strong>One question for you:</strong> Reply to this email and tell me your biggest Amazon challenge right now. I read every reply.</p>
        
        <p>Talk soon,<br>Allysa Kate<br>Founder, Amajungle</p>
      </div>
    </body>
    </html>
  `;
}
*/

/**
 * EmailJS Alternative (Client-side)
 * If you prefer client-side email sending, use EmailJS instead
 * 
 * 1. Sign up at https://www.emailjs.com/
 * 2. Create an email template
 * 3. Use the service ID and template ID below
 */

export const EMAILJS_CONFIG = {
  serviceId: 'YOUR_SERVICE_ID', // Replace with your EmailJS service ID
  templateId: 'YOUR_TEMPLATE_ID', // Replace with your EmailJS template ID
  publicKey: 'YOUR_PUBLIC_KEY', // Replace with your EmailJS public key
};

/**
 * EmailJS send function example
 */
export const sendLeadViaEmailJS = async (data: LeadCaptureData) => {
  // Dynamically import emailjs-com to avoid SSR issues
  const emailjs = await import('emailjs-com');
  
  return emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    {
      to_email: 'hello@amajungle.com',
      from_name: data.name,
      from_email: data.email,
      revenue: data.revenue,
      source: data.source,
      timestamp: data.timestamp,
    },
    EMAILJS_CONFIG.publicKey
  );
};
