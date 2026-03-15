/**
 * Retargeting Pixel Configuration
 * 
 * Add these to your index.html <head> section
 * 
 * IMPORTANT: Replace the placeholder IDs with your actual pixel IDs:
 * - FACEBOOK_PIXEL_ID: Your Facebook Pixel ID (e.g., '123456789012345')
 * - GOOGLE_ADS_ID: Your Google Ads Conversion ID (e.g., 'AW-12345678901')
 * - GOOGLE_ADS_CONVERSION_LABEL: Your conversion label for leads
 */

// Type definitions for global window object
declare global {
  interface Window {
    fbq?: (command: string, event: string, params?: Record<string, unknown>) => void;
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
  }
}

// Helper type for pixel event parameters
type PixelParams = Record<string, string | number | boolean | undefined>;

export const PIXEL_CONFIG = {
  facebook: {
    pixelId: 'FACEBOOK_PIXEL_ID', // Replace with your actual FB Pixel ID
    enabled: true,
    events: {
      pageView: 'PageView',
      lead: 'Lead',
      initiateCheckout: 'InitiateCheckout',
      leadMagnetShown: 'LeadMagnetShown',
    },
  },
  googleAds: {
    conversionId: 'GOOGLE_ADS_ID', // Replace with your actual Google Ads ID
    conversionLabel: 'GOOGLE_ADS_CONVERSION_LABEL', // Replace with your lead conversion label
    enabled: true,
    events: {
      pageView: 'page_view',
      lead: 'generate_lead',
      initiateCheckout: 'begin_checkout',
    },
  },
} as const;

/**
 * Tracking Helper Functions
 * Use these to fire pixel events from React components
 */

// Facebook Pixel Events
export const trackFacebookEvent = (eventName: string, params?: PixelParams) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
};

export const trackFacebookCustomEvent = (eventName: string, params?: PixelParams) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, params);
  }
};

// Google Ads Events
export const trackGoogleEvent = (eventName: string, params?: PixelParams) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

// Track Calendly booking initiated
export const trackCalendlyInitiated = () => {
  trackFacebookEvent('InitiateCheckout');
  trackGoogleEvent('begin_checkout');
};

// Track lead form submission
export const trackLeadCapture = (value: number = 0, currency: string = 'USD') => {
  trackFacebookEvent('Lead');
  trackGoogleEvent('generate_lead', { value, currency });
};

// Track page view (for SPA navigation)
export const trackPageView = (pagePath?: string) => {
  trackFacebookEvent('PageView');
  if (pagePath) {
    trackGoogleEvent('page_view', { page_path: pagePath });
  }
};
