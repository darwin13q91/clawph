import type { VercelRequest, VercelResponse } from '@vercel/node';

// Internal email API endpoint (PrivateEmail SMTP via Flask API)
// This can be overridden with environment variable for local development
const EMAIL_API_URL = process.env.EMAIL_API_URL || 'https://amajungle-email-api.vercel.app/api/send-email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, revenue, source, timestamp, utm_source, utm_medium, utm_campaign } = req.body;

    // Validate required fields
    if (!name || !email || !revenue) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email', 'revenue']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const captureTimestamp = timestamp || new Date().toISOString();
    const leadSource = source || 'lead_magnet_popup';

    // Prepare email content for lead notification to hello@amajungle.com
    const leadNotificationHtml = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0B3A2C; border-bottom: 3px solid #CFFF00; padding-bottom: 10px;">
          🎯 New Lead Magnet Download
        </h2>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong style="color: #0B3A2C;">Name:</strong> ${name}</p>
          <p><strong style="color: #0B3A2C;">Email:</strong> <a href="mailto:${email}" style="color: #6E2E8C;">${email}</a></p>
          <p><strong style="color: #0B3A2C;">Monthly Revenue:</strong> ${revenue}</p>
          <p><strong style="color: #0B3A2C;">Source:</strong> ${leadSource}</p>
          <p><strong style="color: #0B3A2C;">Captured:</strong> ${captureTimestamp}</p>
          ${utm_source ? `<p><strong style="color: #0B3A2C;">UTM Source:</strong> ${utm_source}</p>` : ''}
          ${utm_medium ? `<p><strong style="color: #0B3A2C;">UTM Medium:</strong> ${utm_medium}</p>` : ''}
          ${utm_campaign ? `<p><strong style="color: #0B3A2C;">UTM Campaign:</strong> ${utm_campaign}</p>` : ''}
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        
        <p style="color: #666; font-size: 14px;">
          <strong>Next Steps:</strong> This lead should receive the nurture sequence starting with Day 0 (Welcome) email.
        </p>
        
        <div style="background: #0B3A2C; color: #CFFF00; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; font-weight: 600;">🤖 Piper Action Required:</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Send Day 0 nurture email to ${email}</p>
        </div>
      </div>
    `;

    // 1. Send notification to Echo (hello@amajungle.com) via internal email API
    const leadNotificationResponse = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: 'hello@amajungle.com',
        subject: `🎯 New Lead: ${name} - ${revenue}/month`,
        message: leadNotificationHtml,
        from_name: 'Amajungle Leads',
        client_name: name,
        client_email: email,
        service: 'Lead Magnet Download'
      }),
    });

    if (!leadNotificationResponse.ok) {
      const errorData = await leadNotificationResponse.json().catch(() => ({}));
      console.error('Lead notification email failed:', errorData);
      throw new Error(`Failed to send lead notification: ${leadNotificationResponse.status}`);
    }

    // 2. Send welcome email to lead with checklist via internal email API
    const welcomeEmailHtml = generateWelcomeEmail(name);
    
    const welcomeResponse = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: email,
        subject: "Your Amazon Seller's Checklist + one quick win",
        message: welcomeEmailHtml,
        from_name: 'Allysa Kate',
        client_name: name,
        client_email: email,
        service: 'Welcome Email'
      }),
    });

    if (!welcomeResponse.ok) {
      const errorData = await welcomeResponse.json().catch(() => ({}));
      console.error('Welcome email failed:', errorData);
      // Don't throw here - we still captured the lead even if welcome email fails
      console.warn(`Welcome email failed for ${email}, but lead was captured`);
    }

    // 3. Log success (in production, also log to CRM)
    console.log(`Lead captured: ${email} (${revenue})`);

    return res.status(200).json({ 
      success: true, 
      message: 'Lead captured successfully'
    });

  } catch (error) {
    console.error('Lead capture error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateWelcomeEmail(name: string): string {
  const checklistUrl = 'https://amajungle.com/downloads/amazon-checklist.html';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Amazon Checklist</title>
      <style>
        body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #0B3A2C; margin: 0; padding: 0; background: #F6F7EB; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #0B3A2C, #165C46); padding: 40px 30px; text-align: center; }
        .header h1 { color: #CFFF00; font-size: 28px; margin: 0 0 10px 0; font-weight: 800; }
        .header p { color: rgba(246,247,235,0.8); margin: 0; font-size: 16px; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #CFFF00, #9FE870); color: #0B3A2C; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 20px 0; }
        .tip { background: rgba(207,255,0,0.1); border-left: 4px solid #CFFF00; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .footer { background: #0B3A2C; color: #F6F7EB; padding: 30px; text-align: center; font-size: 14px; }
        .footer a { color: #CFFF00; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Hey ${name}, thanks for downloading!</h1>
          <p>Your Amazon Pre-Launch Checklist is ready</p>
        </div>
        
        <div class="content">
          <p>Here's your <strong>Amazon Seller's Pre-Launch Checklist</strong> — the 12 critical checkpoints that separate sellers who launch to crickets from sellers who hit the ground running.</p>
          
          <p style="text-align: center;">
            <a href="${checklistUrl}" class="button">📋 Open Your Checklist</a>
          </p>
          
          <p><strong>Most sellers skip #7</strong> — and it costs them later. Make sure you check every box before your next launch.</p>
          
          <div class="tip">
            <strong>💡 Quick Win You Can Implement Today:</strong><br>
            Open your best-selling ASIN. Look at your main image. Does it show the product <em>in use</em>? Can you read the key feature at thumbnail size? Most sellers lose 20-30% of potential clicks because their main image looks like a catalog shot.
          </div>
          
          <h3 style="margin-top: 30px;">Who we are (briefly):</h3>
          <p>I'm Allysa Kate, founder of Amajungle. We build AI agents that handle the repetitive work Amazon sellers face daily — listing optimization, PPC adjustments, pricing updates, competitor monitoring.</p>
          
          <p><strong>One-time setup. You own the system. 30-day guarantee.</strong></p>
          
          <p style="margin-top: 30px;"><strong>One question for you:</strong> Just reply to this email and tell me your biggest Amazon challenge right now. Is it PPC eating your margins? Listing conversions? Inventory forecasting?</p>
          
          <p>I read every reply. And I might send over a specific resource or quick video that helps.</p>
          
          <p>Talk soon,<br><strong>Allysa Kate</strong><br>Founder, Amajungle</p>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">P.S. — Save this email. Most sellers get the checklist but don't take action. Be the exception.</p>
        </div>
        
        <div class="footer">
          <p>amajungle — AI Automation for Amazon Sellers</p>
          <p><a href="https://amajungle.com">amajungle.com</a> | <a href="mailto:hello@amajungle.com">hello@amajungle.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
