export function getFriendlyErrorMessage(error: any, defaultMsg = 'Oops! Something went wrong. Please try again.'): string {
  if (!error) return defaultMsg;
  const msg = typeof error === 'string' ? error : (error.message || error.toString());
  
  const lowerMsg = msg.toLowerCase();
  
  // Connection / Network issues
  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('network error') || lowerMsg.includes('econnrefused')) {
    return 'We are having trouble connecting to our servers. Please check your internet connection and try again.';
  }
  
  // Server-side errors
  if (lowerMsg.includes('server error') || lowerMsg.includes('500') || lowerMsg.includes('internal server error')) {
    return 'Our servers are experiencing a hiccup. Our team has been notified!';
  }
  
  // Authentication / Authorization
  if (lowerMsg.includes('unauthorized') || lowerMsg.includes('401') || lowerMsg.includes('token expired')) {
    return 'Your session might have expired. Please try logging in again.';
  }
  
  // Not found
  if (lowerMsg.includes('not found') || lowerMsg.includes('404')) {
    return "We couldn't find what you were looking for. It might have been moved or deleted.";
  }
  
  // Timeouts
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
    return 'The request took too long. Please try again later.';
  }
  
  // Database / Validation common errors
  if (lowerMsg.includes('duplicate key') || lowerMsg.includes('e11000')) {
    return 'This record already exists in our system.';
  }
  
  // AI / Image generation errors
  if (lowerMsg.includes('image could not be read') || lowerMsg.includes('not a supported image format') || lowerMsg.includes('corrupted') || lowerMsg.includes('input.image_urls')) {
    return 'Image generation failed: one or more reference images could not be processed. Please try a different product image or template.';
  }

  if (lowerMsg.includes('content_policy') || lowerMsg.includes('content policy') || lowerMsg.includes('safety filter') || lowerMsg.includes('content checker')) {
    return 'Your request was blocked by the AI safety filter. Please try rephrasing your instruction.';
  }

  if (lowerMsg.includes('out of credits') || lowerMsg.includes('insufficient credits') || lowerMsg.includes('credit')) {
    return "You've run out of credits. Please top up to continue generating content.";
  }

  if (lowerMsg.includes('quota') || lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
    return 'Too many requests right now. Please wait a moment and try again.';
  }

  // Raw JSON / array error bleed-through from AI APIs — never show to users
  if (lowerMsg.includes("'loc'") || lowerMsg.includes('"loc"') || lowerMsg.startsWith('[{') || lowerMsg.includes('value_error')) {
    return 'Something went wrong while processing your request. Please try again.';
  }

  // If no generic tech error pattern is matched, we assume the backend sent a human-readable message 
  // (like "Invalid email or password", "Email already in use", etc.) or we return the default.
  return msg || defaultMsg;
}
