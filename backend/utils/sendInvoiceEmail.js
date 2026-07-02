import sgMail from '@sendgrid/mail';

// ─── Company / Brand Info ────────────────────────────────────────────────────
const COMPANY_ADDRESS = {
  line1: 'SyncSocio Technologies Pvt. Ltd.',
  line2: 'Pune, Maharashtra — 411001',
  country: 'India',
  gstin: '27AAAAA0000A1Z5',
  supportEmail: 'support@syncsocio.in',
};

// ─── Pack / Plan Labels ───────────────────────────────────────────────────────
const TOPUP_META = {
  100: { label: 'Starter Credit Pack',  subtitle: '100 AI Credits · Value Pack', icon: '⚡' },
  300: { label: 'Growth Credit Pack',   subtitle: '300 AI Credits · Best Value', icon: '🚀' },
  700: { label: 'Power Credit Pack',    subtitle: '700 AI Credits · Max Power',  icon: '💎' },
};

const PLAN_META = {
  Starter: {
    label: 'Starter Plan',
    subtitle: '200 Credits / month · 1 Brand Profile',
    icon: '🌱',
    features: [
      '200 AI credits / month',
      '1 active brand profile',
      'Festival calendar access',
      'Hinglish + 5 language support',
      'Caption & hashtag generation',
      'Post scheduling (up to 30 posts)',
      'Analytics dashboard',
      'Email support',
    ],
  },
  Elite: {
    label: 'Elite Plan',
    subtitle: '700 Credits / month · 3 Brand Profiles',
    icon: '👑',
    features: [
      '700 AI credits / month',
      '3 brand profiles',
      'All-in-One Drop feature',
      'AI Mode (Auto Generate)',
      'E-commerce listing generator',
      'UGC & Product video generation',
      'DM Automation',
      'WhatsApp campaign generator',
      'Best time to post analysis',
      'Priority generation',
      'WhatsApp support',
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genInvoiceNo = (id) => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const s = id ? String(id).slice(-6).toUpperCase() : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SS-${y}${m}-${s}`;
};

const fmtDate = (d) =>
  (d ? new Date(d) : new Date()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

const resolvePack = (type, planName, creditsAdded) => {
  if (type === 'topup') {
    return TOPUP_META[creditsAdded] || { label: `${creditsAdded} Credit Top-up`, subtitle: `${creditsAdded} AI Credits`, icon: '⚡', features: [] };
  }
  const key = Object.keys(PLAN_META).find((k) => (planName || '').toLowerCase().includes(k.toLowerCase()));
  return key ? PLAN_META[key] : { label: `${planName || 'Unknown'} Plan`, subtitle: '', icon: '📦', features: [] };
};

const featureRows = (features = []) =>
  features.map((f) => `<tr><td style="padding:5px 0;color:#374151;font-size:13px;"><span style="color:#2563EB;font-weight:700;margin-right:8px;">✓</span>${f}</td></tr>`).join('');



// ─── HTML Builder ─────────────────────────────────────────────────────────────
const buildHTML = (p) => {
  const isPlan = ['plan_purchase', 'plan_upgrade', 'plan_renewal'].includes(p.transactionType);
  const dashUrl = (process.env.FRONTEND_BASE_URL || 'https://syncsocio.in').replace(/\/+$/, '');
  const typeLabel = { topup:'Credit Top-up', plan_purchase:'Plan Purchase', plan_upgrade:'Plan Upgrade', plan_renewal:'Plan Renewal' }[p.transactionType] || 'Purchase';
  const upgradeTag = p.transactionType === 'plan_upgrade' ? '<span style="background:#FEF3C7;color:#92400E;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:8px;">UPGRADE</span>' : '';
  const renewTag  = p.transactionType === 'plan_renewal'  ? '<span style="background:#EDE9FE;color:#5B21B6;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:8px;">RENEWAL</span>' : '';

  const billingName   = p.billingAddress?.fullName   || p.userName  || 'Valued Customer';
  const billingEmail  = p.billingAddress?.email       || p.userEmail || '';
  const billingStreet = p.billingAddress?.streetAddress || '';
  const billingCity   = p.billingAddress?.city        || '';
  const billingPin    = p.billingAddress?.postalCode  || '';
  const billingCntry  = p.billingAddress?.country     || 'India';

  const couponRow = (p.couponCode && p.discountAmount > 0)
    ? `<tr style="background:#F0FDF4;">
        <td colspan="2" style="padding:10px 18px;color:#065F46;font-size:13px;font-weight:600;">
          🏷️ Coupon: <strong>${p.couponCode}</strong>${p.discountPercentage ? ` (${p.discountPercentage}% off)` : ''}
        </td>
        <td style="padding:10px 18px;color:#059669;font-size:13px;font-weight:700;text-align:right;">−₹${parseFloat(p.discountAmount).toFixed(2)}</td>
       </tr>`
    : '';

  const expiryRow = isPlan && p.planExpiresAt
    ? `<div style="margin-top:10px;color:#6B7280;font-size:11px;">📅 Active until <strong style="color:#111827;">${fmtDate(p.planExpiresAt)}</strong></div>`
    : '';

  const featuresBlock = isPlan && p.packMeta.features?.length
    ? `<div style="margin-top:14px;padding:12px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
        <div style="color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Plan Includes</div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">${featureRows(p.packMeta.features)}</table>
       </div>`
    : '';

  const creditsBlock = p.creditsAdded
    ? `<tr><td style="background:#FFFFFF;padding:0 40px 28px 40px;text-align:center;">
        <div style="display:inline-block;background:linear-gradient(135deg,#DBEAFE,#EDE9FE);border:1px solid #BFDBFE;border-radius:14px;padding:16px 28px;">
          <div style="color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Credits Added to Your Account</div>
          <div style="color:#1D4ED8;font-size:32px;font-weight:900;margin-top:4px;">+${p.creditsAdded} ⚡</div>
          <div style="color:#4B5563;font-size:12px;margin-top:2px;">Available immediately in your dashboard</div>
        </div>
       </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Invoice ${p.invoiceNumber} — SyncSocio</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

<!-- HEADER -->
<tr><td style="background:linear-gradient(135deg,#1D4ED8 0%,#2563EB 60%,#4F46E5 100%);border-radius:20px 20px 0 0;padding:32px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td>
      <span style="color:#FFF;font-size:26px;font-weight:900;letter-spacing:-0.5px;">SyncSocio</span>
      <span style="display:block;color:rgba(255,255,255,0.65);font-size:11px;font-weight:500;margin-top:2px;letter-spacing:0.5px;">AI-POWERED SOCIAL MEDIA ENGINE</span>
    </td>
    <td align="right" valign="top">
      <div style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:12px;padding:10px 18px;text-align:right;">
        <div style="color:rgba(255,255,255,0.75);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">TAX INVOICE</div>
        <div style="color:#FFF;font-size:16px;font-weight:800;margin-top:2px;">${p.invoiceNumber}</div>
      </div>
    </td>
  </tr></table>
</td></tr>

<!-- PAYMENT CONFIRMED BANNER -->
<tr><td style="background:#FFF;padding:28px 40px 0 40px;">
  <div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border:1px solid #6EE7B7;border-radius:14px;padding:18px 22px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">✅</div>
    <div style="color:#065F46;font-size:17px;font-weight:800;">Payment Confirmed!</div>
    <div style="color:#047857;font-size:13px;margin-top:4px;">Your ${typeLabel} was processed successfully.</div>
  </div>
</td></tr>

<!-- MAIN CARD -->
<tr><td style="background:#FFF;padding:28px 40px 0 40px;">

  <!-- Invoice Meta -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:28px;">
    <tr style="background:#F9FAFB;">
      <td style="padding:14px 18px;border-right:1px solid #E5E7EB;">
        <div style="color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Invoice Date</div>
        <div style="color:#111827;font-size:14px;font-weight:700;margin-top:4px;">${p.invoiceDate}</div>
      </td>
      <td style="padding:14px 18px;border-right:1px solid #E5E7EB;">
        <div style="color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Payment ID</div>
        <div style="color:#111827;font-size:12px;font-weight:600;margin-top:4px;font-family:monospace;">${p.razorpayPaymentId || '—'}</div>
      </td>
      <td style="padding:14px 18px;">
        <div style="color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Order ID</div>
        <div style="color:#111827;font-size:12px;font-weight:600;margin-top:4px;font-family:monospace;">${p.razorpayOrderId || '—'}</div>
      </td>
    </tr>
  </table>

  <!-- Billed To / From -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
    <tr>
      <td width="50%" valign="top" style="padding-right:16px;">
        <div style="color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Billed To</div>
        <div style="color:#111827;font-size:15px;font-weight:800;">${billingName}</div>
        <div style="color:#4B5563;font-size:13px;margin-top:3px;">${billingEmail}</div>
        ${billingStreet ? `<div style="color:#4B5563;font-size:13px;margin-top:2px;">${billingStreet}</div>` : ''}
        ${billingCity || billingPin ? `<div style="color:#4B5563;font-size:13px;margin-top:2px;">${[billingCity, billingPin].filter(Boolean).join(' — ')}</div>` : ''}
        <div style="color:#4B5563;font-size:13px;margin-top:2px;">${billingCntry}</div>
      </td>
      <td width="50%" valign="top" style="padding-left:16px;border-left:1px solid #E5E7EB;">
        <div style="color:#6B7280;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">From</div>
        <div style="color:#111827;font-size:15px;font-weight:800;">SyncSocio Technologies Pvt. Ltd.</div>
        <div style="color:#4B5563;font-size:13px;margin-top:3px;">${COMPANY_ADDRESS.supportEmail}</div>
        <div style="color:#4B5563;font-size:13px;margin-top:2px;">${COMPANY_ADDRESS.line2}</div>
        <div style="color:#4B5563;font-size:13px;margin-top:2px;">${COMPANY_ADDRESS.country}</div>
        <div style="color:#6B7280;font-size:11px;margin-top:4px;">GSTIN: ${COMPANY_ADDRESS.gstin}</div>
      </td>
    </tr>
  </table>

  <!-- Item Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;margin-bottom:20px;">
    <tr style="background:linear-gradient(90deg,#1D4ED8,#4F46E5);">
      <td style="padding:12px 18px;color:#FFF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;" width="55%">Description</td>
      <td style="padding:12px 18px;color:#FFF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;text-align:center;" width="20%">Credits</td>
      <td style="padding:12px 18px;color:#FFF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;text-align:right;" width="25%">Amount</td>
    </tr>
    <tr style="background:#FFF;">
      <td style="padding:18px 18px 12px 18px;vertical-align:top;">
        <div style="font-size:22px;display:inline;">${p.packMeta.icon}</div>
        <span style="margin-left:8px;color:#111827;font-size:15px;font-weight:800;">${p.packMeta.label}</span>
        ${upgradeTag}${renewTag}
        <div style="color:#6B7280;font-size:12px;margin-top:4px;margin-left:30px;">${p.packMeta.subtitle}</div>
        ${featuresBlock}
        ${expiryRow}
      </td>
      <td style="padding:18px 18px 12px 18px;text-align:center;vertical-align:top;">
        <span style="background:#EFF6FF;color:#1D4ED8;font-size:13px;font-weight:800;padding:4px 12px;border-radius:20px;">
          ${p.creditsAdded ? `+${p.creditsAdded}` : '—'}
        </span>
      </td>
      <td style="padding:18px 18px 12px 18px;text-align:right;vertical-align:top;">
        <div style="color:#111827;font-size:16px;font-weight:800;">₹${parseFloat(p.amount).toFixed(2)}</div>
      </td>
    </tr>
    <tr><td colspan="3" style="height:1px;background:#F3F4F6;"></td></tr>
    ${couponRow}
    <tr style="background:linear-gradient(90deg,#EFF6FF,#EDE9FE);">
      <td colspan="2" style="padding:16px 18px;color:#1E3A8A;font-size:15px;font-weight:800;">Total Amount Paid</td>
      <td style="padding:16px 18px;text-align:right;color:#1D4ED8;font-size:20px;font-weight:900;">₹${parseFloat(p.amount).toFixed(2)}</td>
    </tr>
  </table>

</td></tr>

<!-- CREDITS BADGE -->
${creditsBlock}

<!-- CTA -->
<tr><td style="background:#FFF;padding:0 40px 32px 40px;text-align:center;">
  <a href="${dashUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#4F46E5);color:#FFF;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
    Go to Dashboard →
  </a>
  <div style="margin-top:12px;color:#9CA3AF;font-size:11px;">
    Questions? Email us at <a href="mailto:${COMPANY_ADDRESS.supportEmail}" style="color:#2563EB;text-decoration:none;font-weight:600;">${COMPANY_ADDRESS.supportEmail}</a>
  </div>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:linear-gradient(135deg,#1D4ED8,#4F46E5);border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;">
  <div style="color:rgba(255,255,255,0.9);font-size:14px;font-weight:800;margin-bottom:4px;">SyncSocio Technologies Pvt. Ltd.</div>
  <div style="color:rgba(255,255,255,0.6);font-size:11px;margin-bottom:12px;">Pune, Maharashtra · India · GSTIN: ${COMPANY_ADDRESS.gstin}</div>
  <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:12px;">
    <a href="${dashUrl}" style="color:rgba(255,255,255,0.7);font-size:11px;text-decoration:none;margin:0 10px;">Website</a>
    <span style="color:rgba(255,255,255,0.3);">|</span>
    <a href="${dashUrl}/dashboard" style="color:rgba(255,255,255,0.7);font-size:11px;text-decoration:none;margin:0 10px;">Dashboard</a>
    <span style="color:rgba(255,255,255,0.3);">|</span>
    <a href="mailto:${COMPANY_ADDRESS.supportEmail}" style="color:rgba(255,255,255,0.7);font-size:11px;text-decoration:none;margin:0 10px;">Support</a>
  </div>
  <div style="color:rgba(255,255,255,0.4);font-size:10px;margin-top:10px;">
    © ${new Date().getFullYear()} SyncSocio. All rights reserved. · System-generated invoice, no signature required.
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

// ─── Plain-text fallback ──────────────────────────────────────────────────────
const buildText = (p) => {
  return [
    'SyncSocio — Tax Invoice',
    `Invoice #: ${p.invoiceNumber}`,
    `Date: ${p.invoiceDate}`,
    '',
    `Billed To: ${p.userName || 'Valued Customer'} <${p.userEmail}>`,
    '',
    '─────────────────────────────────────────',
    `ITEM: ${p.packMeta.label} (${p.packMeta.subtitle})`,
    `Credits Added: +${p.creditsAdded}`,
    `TOTAL PAID: ₹${parseFloat(p.amount).toFixed(2)}`,
    '─────────────────────────────────────────',
    `Payment ID: ${p.razorpayPaymentId || '—'}`,
    `Order ID:   ${p.razorpayOrderId   || '—'}`,
    '',
    `Questions? ${COMPANY_ADDRESS.supportEmail}`,
    `© ${new Date().getFullYear()} SyncSocio Technologies Pvt. Ltd., Pune, India`,
  ].join('\n');
};

// ─── EXPORTED FUNCTION ────────────────────────────────────────────────────────
/**
 * sendInvoiceEmail — send professional tax invoice after successful payment.
 *
 * @param {object} opts
 * @param {string}  opts.to                   Recipient email
 * @param {string}  opts.userName             Customer name
 * @param {string}  opts.userEmail            Customer email
 * @param {object}  [opts.billingAddress]     { fullName, email, streetAddress, city, postalCode, country }
 * @param {string}  opts.transactionType      topup | plan_purchase | plan_upgrade | plan_renewal
 * @param {string}  [opts.planName]           Plan name (for plan transactions)
 * @param {number}  opts.amount               Total paid (INR, incl. GST)
 * @param {number}  [opts.creditsAdded]       Credits added
 * @param {string}  [opts.razorpayPaymentId]  Razorpay payment ID
 * @param {string}  [opts.razorpayOrderId]    Razorpay order ID
 * @param {Date}    [opts.planExpiresAt]      Plan expiry date
 * @param {string}  [opts.couponCode]         Coupon used
 * @param {number}  [opts.discountAmount]     Discount amount (INR)
 * @param {number}  [opts.discountPercentage] Discount %
 * @param {string}  [opts.transactionId]      DB _id for invoice number
 */
export const sendInvoiceEmail = async (opts) => {
  const {
    to, userName, userEmail, billingAddress,
    transactionType, planName, amount,
    creditsAdded = 0, razorpayPaymentId, razorpayOrderId,
    planExpiresAt, couponCode, discountAmount = 0,
    discountPercentage = 0, transactionId,
  } = opts;

  const invoiceNumber = genInvoiceNo(transactionId);
  const invoiceDate   = fmtDate(new Date());
  const packMeta      = resolvePack(transactionType, planName, creditsAdded);

  const params = {
    invoiceNumber, invoiceDate, userName, userEmail, billingAddress,
    packMeta, amount, creditsAdded, transactionType, razorpayPaymentId,
    razorpayOrderId, planExpiresAt, couponCode, discountAmount, discountPercentage,
  };

  const typeLabel = {
    topup: 'Credit Top-up', plan_purchase: 'Plan Purchase',
    plan_upgrade: 'Plan Upgrade', plan_renewal: 'Plan Renewal',
  }[transactionType] || 'Purchase';

  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY missing for invoice email.');
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to,
    from: `SyncSocio Billing <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    subject: `Invoice ${invoiceNumber} — ${typeLabel} · ₹${parseFloat(amount).toFixed(2)} Confirmed`,
    text: buildText(params),
    html: buildHTML(params),
  };

  return sgMail.send(msg);
};
