/**
 * emailSetupRoutes.js
 * API routes for brand email domain authentication setup.
 * All routes use the existing `protect` auth middleware.
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import BrandProfile from '../models/BrandProfile.js';
import {
  createDomainAuthentication,
  verifyDomainAuthentication,
  getDomainStatus,
  pollDomainVerification
} from '../services/emailDomainService.js';

const router = express.Router();

// Helper to format service errors into consistent API responses
function handleServiceError(res, err) {
  console.error('[EmailSetupRoute] Error:', err);
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred. Please try again.';
  const suggestion = err.suggestion || null;
  const status = code === 'BRAND_NOT_FOUND' ? 404
    : code === 'PERSONAL_EMAIL_NOT_ALLOWED' ? 400
    : code === 'SETUP_NOT_STARTED' ? 400
    : code === 'DOMAIN_ALREADY_REGISTERED' ? 409
    : code === 'INVALID_EMAIL' ? 400
    : 500;
  return res.status(status).json({ code, message, ...(suggestion && { suggestion }) });
}

// ── POST /email-setup/start ──────────────────────────────────────────────────
// Body: { from_email }
// Starts domain authentication — creates SendGrid domain & returns DNS records.
router.post('/email-setup/start', protect, async (req, res) => {
  try {
    const { from_email } = req.body;
    if (!from_email || !from_email.trim()) {
      return res.status(400).json({ code: 'MISSING_EMAIL', message: 'from_email is required.' });
    }

    // Get the active brand profile for this user
    const brand = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ code: 'BRAND_NOT_FOUND', message: 'No brand profile found for your account.' });
    }

    const result = await createDomainAuthentication(brand._id, from_email.trim());

    // Start background polling job
    pollDomainVerification(brand._id).catch(err =>
      console.error('[EmailSetupRoute] Poll start error:', err)
    );

    return res.status(200).json({
      success: true,
      domain: result.domain,
      dns_records: result.dns_records,
      already_exists: result.already_exists,
      next_step: 2,
      message: result.already_exists
        ? 'Domain already registered. Showing existing DNS records.'
        : 'DNS records created. Add these to your domain registrar.'
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// ── POST /email-setup/verify ─────────────────────────────────────────────────
// Body: {} (uses authenticated user's brand)
// Triggers verification check against SendGrid.
router.post('/email-setup/verify', protect, async (req, res) => {
  try {
    const brand = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ code: 'BRAND_NOT_FOUND', message: 'No brand profile found.' });
    }

    const result = await verifyDomainAuthentication(brand._id);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// ── GET /email-setup/status ──────────────────────────────────────────────────
// Returns full setup status for UI rendering.
router.get('/email-setup/status', protect, async (req, res) => {
  try {
    const brand = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ code: 'BRAND_NOT_FOUND', message: 'No brand profile found.' });
    }

    const status = await getDomainStatus(brand._id);
    return res.status(200).json({ success: true, ...status });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// ── POST /email-setup/retry ──────────────────────────────────────────────────
// Same as verify - re-triggers verification check.
router.post('/email-setup/retry', protect, async (req, res) => {
  try {
    const brand = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ code: 'BRAND_NOT_FOUND', message: 'No brand profile found.' });
    }

    const result = await verifyDomainAuthentication(brand._id);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export default router;
