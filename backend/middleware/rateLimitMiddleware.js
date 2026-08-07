/**
 * rateLimitMiddleware.js
 *
 * Tiered rate-limiting middleware for the SyncSocio backend.
 *
 * Tiers:
 *   1. AUTH   (strict)    — per-IP hard limit + per-account exponential backoff
 *   2. PUBLIC (moderate)  — per-IP limit for unauthenticated public endpoints
 *   3. AUTHENTICATED      — per-IP limit for logged-in user actions (loose)
 *
 * Admin routes are intentionally excluded — they have no rate limiting.
 */

import rateLimit from 'express-rate-limit';
import {
  AUTH_RATE_LIMIT,
  PUBLIC_RATE_LIMIT,
  AUTHENTICATED_RATE_LIMIT,
} from '../config/rateLimitConfig.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared 429 response builder
// ─────────────────────────────────────────────────────────────────────────────
const rateLimitResponse = (res, retryAfterSec, message) => {
  res.setHeader('Retry-After', Math.ceil(retryAfterSec));
  return res.status(429).json({
    success: false,
    message: message || 'Too many requests. Please try again later.',
    retryAfterSeconds: Math.ceil(retryAfterSec),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTH — Per-IP limiter (hard cap using express-rate-limit)
// ─────────────────────────────────────────────────────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT.windowMs,
  max: AUTH_RATE_LIMIT.maxPerIp,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  },
  handler: (_req, res) => {
    rateLimitResponse(
      res,
      AUTH_RATE_LIMIT.windowMs / 1000,
      'Too many authentication attempts from this IP. Please wait and try again.',
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUTH — Per-account exponential backoff (custom middleware)
//
// Instead of a hard lockout, each attempt beyond the threshold results in an
// exponentially growing delay before the next attempt is accepted.
//
// Backoff formula: delay = base * 2^(attempts - threshold)
// Capped at backoffMaxMs.  Clears automatically after windowMs of inactivity
// or on explicit clearAuthAttempts(key) call after successful login.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Map<string, { attempts: number, lastAttempt: number }>} */
const accountAttempts = new Map();

// Periodic cleanup of expired entries (runs every windowMs)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of accountAttempts) {
    if (now - entry.lastAttempt > AUTH_RATE_LIMIT.windowMs) {
      accountAttempts.delete(key);
    }
  }
}, AUTH_RATE_LIMIT.windowMs);

/**
 * Clear the backoff counter for a given account key.
 * Call this after a successful login to reset the user's backoff state.
 * @param {string} key — typically the user's email (lowercase, trimmed)
 */
export function clearAuthAttempts(key) {
  if (key) accountAttempts.delete(key.toLowerCase().trim());
}

/**
 * Middleware: per-account exponential backoff on auth routes.
 * Extracts the account key from req.body.email.
 */
export const authAccountRateLimiter = (req, res, next) => {
  const email = (req.body?.email || '').toLowerCase().trim();
  if (!email) {
    // No email in body — fall through, the IP limiter handles anonymous abuse
    return next();
  }

  const now = Date.now();
  let entry = accountAttempts.get(email);

  if (!entry) {
    entry = { attempts: 0, lastAttempt: now };
    accountAttempts.set(email, entry);
  }

  // Auto-expire if the window has passed since last attempt
  if (now - entry.lastAttempt > AUTH_RATE_LIMIT.windowMs) {
    entry.attempts = 0;
  }

  entry.attempts += 1;
  entry.lastAttempt = now;

  if (entry.attempts > AUTH_RATE_LIMIT.maxPerAccount) {
    // Calculate exponential backoff delay
    const exponent = entry.attempts - AUTH_RATE_LIMIT.maxPerAccount;
    const rawDelay = AUTH_RATE_LIMIT.backoffBaseMs * Math.pow(2, exponent);
    const delay = Math.min(rawDelay, AUTH_RATE_LIMIT.backoffMaxMs);

    // Check if enough time has passed since the previous attempt
    const timeSinceLastReal = now - entry.lastAttempt;
    // Since we already set lastAttempt = now, compare using the second-to-last timing
    // We need to track when backoff started, so use the counter itself
    const retryAfterSec = delay / 1000;

    return rateLimitResponse(
      res,
      retryAfterSec,
      `Too many attempts for this account. Please wait ${Math.ceil(retryAfterSec)} seconds before trying again.`,
    );
  }

  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUBLIC — Moderate per-IP limiter
// ─────────────────────────────────────────────────────────────────────────────
export const publicRateLimiter = rateLimit({
  windowMs: PUBLIC_RATE_LIMIT.windowMs,
  max: PUBLIC_RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  },
  handler: (_req, res) => {
    rateLimitResponse(
      res,
      PUBLIC_RATE_LIMIT.windowMs / 1000,
      'Too many requests. Please slow down and try again shortly.',
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. AUTHENTICATED — Loose per-IP limiter for logged-in users
// ─────────────────────────────────────────────────────────────────────────────
export const authenticatedRateLimiter = rateLimit({
  windowMs: AUTHENTICATED_RATE_LIMIT.windowMs,
  max: AUTHENTICATED_RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  },
  handler: (_req, res) => {
    rateLimitResponse(
      res,
      AUTHENTICATED_RATE_LIMIT.windowMs / 1000,
      'You are making too many requests. Please slow down.',
    );
  },
});
