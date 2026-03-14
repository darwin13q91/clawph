/**
 * Lead Capture API Configuration
 * Using PrivateEmail API (no external dependencies)
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
 * PrivateEmail API Configuration
 */
const EMAIL_API_URL = 'https://amajungle-email-api.vercel.app/api/send-email';

/**
 * Send lead notification via PrivateEmail API
 * Sends lead data to hello@amajungle.com for Echo to process
 */
export const sendLeadNotification = async (data: LeadCaptureData): Promise<any> => {
  const response = await fetch(EMAIL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: 'hello@amajungle.com',
      subject: `[Lead] ${data.name} - ${data.revenue}`,
      text: `New lead captured from amajungle.com

Name: ${data.name}
Email: ${data.email}
Monthly Revenue: ${data.revenue}
Source: ${data.source}
Timestamp: ${data.timestamp}
${data.utm_source ? `\nUTM Source: ${data.utm_source}` : ''}
${data.utm_medium ? `\nUTM Medium: ${data.utm_medium}` : ''}
${data.utm_campaign ? `\nUTM Campaign: ${data.utm_campaign}` : ''}
`,
      html: `
<h2 style="color: #0B3A2C;">New Lead Captured</h2>
<p><strong style="color: #CFFF00;">Name:</strong> ${data.name}</p>
<p><strong>Email:</strong> ${data.email}</p>
<p><strong>Monthly Revenue:</strong> ${data.revenue}</p>
<p><strong>Source:</strong> ${data.source}</p>
<p><strong>Timestamp:</strong> ${data.timestamp}</p>
${data.utm_source ? `<p><strong>UTM Source:</strong> ${data.utm_source}</p>` : ''}
${data.utm_medium ? `<p><strong>UTM Medium:</strong> ${data.utm_medium}</p>` : ''}
${data.utm_campaign ? `<p><strong>UTM Campaign:</strong> ${data.utm_campaign}</p>` : ''}
<hr>
<p><em>This lead was captured from the Amajungle lead magnet popup.</em></p>
`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Lead capture handler for API routes
 * Use this in your Vercel serverless function or Express endpoint
 */
export const handleLeadCapture = async (req: any, res: any) => {
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
    const data: LeadCaptureData = req.body;

    // Validate required fields
    if (!data.name || !data.email || !data.revenue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send notification to Echo
    await sendLeadNotification(data);

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Lead captured successfully',
      data: {
        email: data.email,
        timestamp: data.timestamp,
      }
    });
  } catch (error) {
    console.error('Lead capture error:', error);
    return res.status(500).json({ error: 'Failed to capture lead' });
  }
};
