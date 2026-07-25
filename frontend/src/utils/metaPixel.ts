/**
 * Utility for tracking Meta Pixel events on the client side.
 * It generates a unique eventID for deduplication with the Conversions API.
 */

// Declare the fbq function on the window object
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

/**
 * Tracks a Meta Pixel event and returns the generated eventID.
 * 
 * @param eventName The name of the event (e.g., 'CompleteRegistration')
 * @param data Additional data to send with the event (e.g., { value: 100, currency: 'INR' })
 * @param isCustom Whether it's a custom event ('trackCustom') or standard event ('track')
 * @param providedEventId Optional pre-generated event ID
 * @returns The generated or provided eventID, or undefined if the pixel isn't loaded
 */
export const trackMetaEvent = (
  eventName: string, 
  data: any = {}, 
  isCustom: boolean = false,
  providedEventId?: string
): string | undefined => {
  if (typeof window === 'undefined' || !window.fbq) {
    console.warn(`[Meta Pixel] fbq is not defined. Could not track ${eventName}.`);
    return undefined;
  }

  try {
    // Generate a unique ID for deduplication if not provided
    const eventId = providedEventId || crypto.randomUUID();
    
    if (isCustom) {
      window.fbq('trackCustom', eventName, data, { eventID: eventId });
    } else {
      window.fbq('track', eventName, data, { eventID: eventId });
    }
    
    console.log(`[Meta Pixel] Tracked ${eventName} with eventID: ${eventId}`);
    return eventId;
  } catch (error) {
    console.error(`[Meta Pixel] Error tracking event ${eventName}:`, error);
    return undefined;
  }
};
