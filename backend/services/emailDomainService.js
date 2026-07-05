/**
 * emailDomainService.js
 * Handles SendGrid per-brand domain authentication.
 * All 5 public functions are exported for use in routes and background jobs.
 */

import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import { createNotification } from '../utils/notificationHelper.js';

const SENDGRID_BASE = 'https://api.sendgrid.com/v3';

const BLOCKED_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'yahoo.in', 'rediffmail.com', 'icloud.com', 'live.com',
  'msn.com', 'aol.com', 'ymail.com', 'me.com'
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendgridHeaders() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('SENDGRID_API_KEY is not configured on the server.');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

function extractDomain(email) {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1].includes('.')) {
    throw { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' };
  }
  return parts[1];
}

// ── Function 1: createDomainAuthentication ───────────────────────────────────

/**
 * Called when a brand enters their sending email address.
 * Creates domain authentication on SendGrid and saves DNS records to MongoDB.
 */
export async function createDomainAuthentication(brandId, fromEmail) {
  const domain = extractDomain(fromEmail);

  // Block personal email providers
  if (BLOCKED_DOMAINS.includes(domain)) {
    throw {
      code: 'PERSONAL_EMAIL_NOT_ALLOWED',
      message: 'Please use a business email like hello@yourbrand.com. Gmail and personal emails cannot be used for bulk sending.',
      suggestion: 'Get a free business email at zoho.com/mail or Google Workspace from Rs 125/month'
    };
  }

  const brand = await BrandProfile.findById(brandId);
  if (!brand) throw { code: 'BRAND_NOT_FOUND', message: 'Brand profile not found.' };

  // Return existing DNS records if domain already authenticated for this brand
  if (brand.email_domain === domain && brand.sendgrid_domain_id) {
    console.log(`[EmailDomain] Domain ${domain} already authenticated for brand ${brandId}. Returning existing records.`);
    return {
      domain,
      dns_records: formatDnsRecordsForDisplay(brand.dns_records, domain),
      domain_id: brand.sendgrid_domain_id,
      already_exists: true
    };
  }

  // Call SendGrid API to create domain authentication
  let sgResponse;
  try {
    const res = await axios.post(
      `${SENDGRID_BASE}/whitelabel/domains`,
      {
        domain,
        subdomain: 'em',
        automatic_security: true,
        custom_spf: false,
        default: false
      },
      { headers: sendgridHeaders() }
    );
    sgResponse = res.data;
  } catch (err) {
    const status = err.response?.status;
    const sgMsg = err.response?.data?.errors?.[0]?.message || '';
    console.error('[EmailDomain] SendGrid domain creation error:', err.response?.data || err.message);

    if (status === 400 && (sgMsg.includes('already') || sgMsg.includes('duplicate'))) {
      throw {
        code: 'DOMAIN_ALREADY_REGISTERED',
        message: 'This domain may already be registered with another email service. Contact support if you need help.'
      };
    }
    
    if (status === 403) {
      throw {
        code: 'SENDGRID_PERMISSION_ERROR',
        message: 'SendGrid API Key lacks required permissions. Please ensure your key has "Sender Authentication" (Domain Authentication) access.'
      };
    }

    throw {
      code: 'SENDGRID_ERROR',
      message: 'Failed to register domain with SendGrid. Please try again or contact support.'
    };
  }

  const domain_id = sgResponse.id;
  const dns_records = {
    mail_cname: sgResponse.dns?.mail_cname || {},
    dkim1: sgResponse.dns?.dkim1 || {},
    dkim2: sgResponse.dns?.dkim2 || {}
  };

  // Save to MongoDB
  await BrandProfile.findByIdAndUpdate(brandId, {
    email_from: fromEmail.trim().toLowerCase(),
    email_domain: domain,
    sendgrid_domain_id: domain_id,
    email_domain_verified: false,
    email_verified_at: null,
    dns_records,
    email_setup_started_at: new Date(),
    email_setup_step: 2
  });

  console.log(`[EmailDomain] Domain ${domain} authenticated on SendGrid (id: ${domain_id}) for brand ${brandId}`);

  return {
    domain,
    dns_records: formatDnsRecordsForDisplay(dns_records, domain),
    domain_id,
    already_exists: false
  };
}

// ── Function 2: verifyDomainAuthentication ───────────────────────────────────

/**
 * Called when brand clicks "I've added the records - Verify now"
 * or by the background polling job.
 */
export async function verifyDomainAuthentication(brandId) {
  const brand = await BrandProfile.findById(brandId);
  if (!brand) throw { code: 'BRAND_NOT_FOUND', message: 'Brand profile not found.' };

  if (!brand.sendgrid_domain_id) {
    throw { code: 'SETUP_NOT_STARTED', message: 'Domain setup has not been started for this brand.' };
  }

  // Call SendGrid validate endpoint
  let sgResponse;
  try {
    const res = await axios.post(
      `${SENDGRID_BASE}/whitelabel/domains/${brand.sendgrid_domain_id}/validate`,
      {},
      { headers: sendgridHeaders() }
    );
    sgResponse = res.data;
  } catch (err) {
    console.error('[EmailDomain] SendGrid validate error:', err.response?.data || err.message);
    throw {
      code: 'SENDGRID_ERROR',
      message: 'Failed to verify domain with SendGrid. Please try again.'
    };
  }

  const isValid = sgResponse.valid === true;
  const validationResults = sgResponse.validation_results || {};

  // Update dns_records valid status per record
  const updatedDnsRecords = {
    mail_cname: {
      ...(brand.dns_records?.mail_cname || {}),
      valid: validationResults?.mail_cname?.valid === true
    },
    dkim1: {
      ...(brand.dns_records?.dkim1 || {}),
      valid: validationResults?.dkim1?.valid === true
    },
    dkim2: {
      ...(brand.dns_records?.dkim2 || {}),
      valid: validationResults?.dkim2?.valid === true
    }
  };

  if (isValid) {
    await BrandProfile.findByIdAndUpdate(brandId, {
      email_domain_verified: true,
      email_verified_at: new Date(),
      email_setup_step: 3,
      dns_records: updatedDnsRecords
    });

    // Send in-app notification
    await createNotification(
      brand.user,
      'success',
      'Email Domain Verified!',
      `Your email domain is verified! You can now send campaigns from ${brand.email_from}`
    );

    console.log(`[EmailDomain] Domain ${brand.email_domain} verified for brand ${brandId}`);
    return { verified: true, email_from: brand.email_from };
  }

  // Update DNS records with current valid state but don't mark as verified
  await BrandProfile.findByIdAndUpdate(brandId, {
    dns_records: updatedDnsRecords
  });

  const failingRecords = Object.entries(validationResults)
    .filter(([, val]) => !val.valid)
    .map(([key]) => key);

  return {
    verified: false,
    failing_records: failingRecords,
    all_results: validationResults,
    updated_dns: updatedDnsRecords,
    message: 'DNS records not detected yet. This can take up to 48 hours. Check that you copied the records correctly and try again.'
  };
}

// ── Function 3: pollDomainVerification ───────────────────────────────────────

/**
 * Background polling job - automatically checks every 10 minutes
 * for up to 48 hours after setup starts. Uses setTimeout (matches project pattern).
 */
export async function pollDomainVerification(brandId) {
  try {
    const brand = await BrandProfile.findById(brandId);
    if (!brand) return;

    // Don't poll if already verified
    if (brand.email_domain_verified) return;

    // Don't poll if setup never started
    if (!brand.sendgrid_domain_id) return;

    // Stop after 48 hours
    const hoursSinceStart = brand.email_setup_started_at
      ? (Date.now() - new Date(brand.email_setup_started_at).getTime()) / (1000 * 60 * 60)
      : 0;

    if (hoursSinceStart > 48) {
      console.log(`[EmailDomain] Polling timed out after 48h for brand ${brandId}`);
      await createNotification(
        brand.user,
        'alert',
        'Email Setup Timed Out',
        `We could not verify your domain ${brand.email_domain} after 48 hours. Please check your DNS records and try again from Settings → Email Setup.`
      );
      return;
    }

    const result = await verifyDomainAuthentication(brandId);

    if (result.verified) {
      // Notification already sent inside verifyDomainAuthentication
      console.log(`[EmailDomain] Background poll verified domain for brand ${brandId}`);
      return;
    }

    // Schedule next check in 10 minutes
    console.log(`[EmailDomain] Domain not yet verified for brand ${brandId}. Next check in 10 min.`);
    setTimeout(() => pollDomainVerification(brandId), 10 * 60 * 1000);

  } catch (err) {
    console.error(`[EmailDomain] Poll error for brand ${brandId}:`, err.message || err);
    // Retry in 10 minutes even on error (transient network issues)
    setTimeout(() => pollDomainVerification(brandId), 10 * 60 * 1000);
  }
}

// ── Function 4: getDomainStatus ──────────────────────────────────────────────

/**
 * Returns current email domain setup status for UI display.
 */
export async function getDomainStatus(brandId) {
  const brand = await BrandProfile.findById(brandId);
  if (!brand) throw { code: 'BRAND_NOT_FOUND', message: 'Brand profile not found.' };

  return {
    setup_started: !!brand.sendgrid_domain_id,
    verified: brand.email_domain_verified || false,
    email_from: brand.email_from || '',
    domain: brand.email_domain || '',
    step: brand.email_setup_step || 1,
    dns_records: brand.dns_records
      ? formatDnsRecordsForDisplay(brand.dns_records, brand.email_domain)
      : null,
    verified_at: brand.email_verified_at || null
  };
}

// ── Function 5: formatDnsRecordsForDisplay ───────────────────────────────────

/**
 * Converts SendGrid DNS record format into a clean table format for UI display.
 */
export function formatDnsRecordsForDisplay(dns_records, domain = '') {
  if (!dns_records) return [];

  const stripDomain = (host) => {
    if (!host || !domain) return host;
    const suffix = `.${domain}`;
    return host.endsWith(suffix) ? host.slice(0, -suffix.length) : host;
  };

  return [
    {
      type: 'CNAME',
      host: stripDomain(dns_records.mail_cname?.host || ''),
      value: dns_records.mail_cname?.data || '',
      valid: dns_records.mail_cname?.valid || false,
      purpose: 'Mail server routing'
    },
    {
      type: 'CNAME',
      host: stripDomain(dns_records.dkim1?.host || ''),
      value: dns_records.dkim1?.data || '',
      valid: dns_records.dkim1?.valid || false,
      purpose: 'Email authentication (DKIM 1)'
    },
    {
      type: 'CNAME',
      host: stripDomain(dns_records.dkim2?.host || ''),
      value: dns_records.dkim2?.data || '',
      valid: dns_records.dkim2?.valid || false,
      purpose: 'Email authentication (DKIM 2)'
    }
  ];
}
