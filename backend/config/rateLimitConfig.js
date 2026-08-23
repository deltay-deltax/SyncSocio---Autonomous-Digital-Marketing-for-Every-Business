/**
 * rateLimitConfig.js
 * Central configuration for all rate-limiting thresholds.
 * Every value is read from environment variables with sensible defaults.
 * Admin routes are NOT included here — they are hardcoded / left untouched.
 */

// ── Auth (Strict) ────────────────────────────────────────────────────────────
export const AUTH_RATE_LIMIT = {
  /** Sliding window in milliseconds (default 15 min) */
  windowMs:       parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10)       || 15 * 60 * 1000,
  /** Max requests from a single IP inside the window */
  maxPerIp:       parseInt(process.env.RATE_LIMIT_AUTH_MAX_PER_IP, 10)      || 10,
  /** Max requests per account (email) before backoff kicks in */
  maxPerAccount:  parseInt(process.env.RATE_LIMIT_AUTH_MAX_PER_ACCOUNT, 10) || 5,
  /** Base delay for exponential backoff (ms) */
  backoffBaseMs:  parseInt(process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_MS, 10) || 1000,
  /** Maximum backoff delay cap (ms, default 5 min) */
  backoffMaxMs:   parseInt(process.env.RATE_LIMIT_AUTH_BACKOFF_MAX_MS, 10)  || 5 * 60 * 1000,
};

// ── Public (Moderate) ────────────────────────────────────────────────────────
export const PUBLIC_RATE_LIMIT = {
  windowMs:       parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:            parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10)       || 60,
};

// ── Authenticated (Loose) ────────────────────────────────────────────────────
export const AUTHENTICATED_RATE_LIMIT = {
  windowMs:       parseInt(process.env.RATE_LIMIT_AUTHENTICATED_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:            parseInt(process.env.RATE_LIMIT_AUTHENTICATED_MAX, 10)       || 1000,
};
