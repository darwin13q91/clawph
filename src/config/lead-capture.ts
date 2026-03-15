/**
 * Lead Capture API Configuration
 * Client-side lead capture handler using external email API
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

interface LeadCaptureResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Submit lead capture to the API
 * Calls the /api/lead-capture endpoint which then uses the email API
 */
export const submitLeadCapture = async (
  data: LeadCaptureData
): Promise<LeadCaptureResponse> => {
  try {
    const response = await fetch('/api/lead-capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      message: result.message || 'Lead captured successfully',
    };
  } catch (error) {
    console.error('Lead capture submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Validate lead data before submission
 */
export const validateLeadData = (
  data: Partial<LeadCaptureData>
): { valid: boolean; errors: Partial<Record<keyof LeadCaptureData, string>> } => {
  const errors: Partial<Record<keyof LeadCaptureData, string>> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name is required (min 2 characters)';
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.revenue) {
    errors.revenue = 'Please select your revenue range';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Get UTM parameters from URL for tracking
 */
export const getUtmParams = (): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} => {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
};
