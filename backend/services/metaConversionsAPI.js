import axios from 'axios';
import crypto from 'crypto';

/**
 * Hash data using SHA-256 (required by Meta for PII)
 */
const hashData = (data) => {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
};

/**
 * Send an event to the Meta Conversions API
 * 
 * @param {string} eventName - Name of the event (e.g. 'CompleteRegistration')
 * @param {string} eventId - Unique event ID matching the browser pixel event
 * @param {object} userData - User info (email, phone, clientIp, clientUserAgent)
 * @param {object} customData - Event specific data (value, currency, etc)
 */
export const sendMetaCapiEvent = async (eventName, eventId, userData = {}, customData = {}) => {
  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn(`[Meta CAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN env vars. Cannot send ${eventName}.`);
    return false;
  }

  // Hash required PII fields
  const hashedEmail = hashData(userData.email);
  const hashedPhone = hashData(userData.phone);

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_id: eventId,
        user_data: {
          em: hashedEmail ? [hashedEmail] : undefined,
          ph: hashedPhone ? [hashedPhone] : undefined,
          client_ip_address: userData.clientIp,
          client_user_agent: userData.clientUserAgent,
          fbp: userData.fbp, // optional
          fbc: userData.fbc  // optional
        },
        custom_data: customData,
      }
    ]
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log(`[Meta CAPI] Successfully sent ${eventName} event (ID: ${eventId})`, response.data);
    return true;
  } catch (error) {
    console.error(`[Meta CAPI] Error sending ${eventName} event:`, error.response?.data || error.message);
    return false;
  }
};
