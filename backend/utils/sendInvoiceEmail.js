import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Company / Brand Info ────────────────────────────────────────────────────
export const COMPANY_ADDRESS = {
  line1: 'SyncSocio',
  line2: 'AECS Layout, Kundalahalli, Bengaluru, Karnataka 560037',
  country: '',
  gstin: '',
  supportEmail: 'support@syncsocio.com',
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
    subtitle: '700 Credits / month · 2 Brand Profiles',
    icon: '👑',
    features: [
      '700 AI credits / month (70 images @ 10 cr/gen)',
      '50%+ Margin',
      '2 brand profiles',
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
  Agency: {
    label: 'Agency Plan',
    subtitle: '1,750 Credits / month · 8 Brand Profiles',
    icon: '🚀',
    features: [
      '1,750 AI credits / month (175 images @ 10 cr/gen)',
      '45-55% Margin',
      '8 active brand profiles',
      'All-in-One Drop feature',
      'UGC & Product video generation',
      'Dedicated Account Manager',
      'Highest Priority generation',
      '24/7 Priority support',
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const genInvoiceNo = (id) => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const s = id ? String(id).slice(-6).toUpperCase() : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SS-${y}${m}-${s}`;
};

export const fmtDate = (d) =>
  (d ? new Date(d) : new Date()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

export const resolvePack = (type, planName, creditsAdded) => {
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
  const dashUrl = (process.env.FRONTEND_BASE_URL || 'https://syncsocio.com').replace(/\/+$/, '');
  const apiBaseUrl = (process.env.BACKEND_URL || 'https://syncsocio-backend-87zk.onrender.com').replace(/\/+$/, '');
  const typeLabel = { topup:'Credit Top-up', plan_purchase:'Plan Purchase', plan_upgrade:'Plan Upgrade', plan_renewal:'Plan Renewal', dm_addon_purchase: 'DM Automation Add-on' }[p.transactionType] || 'Purchase';
  
  const discountRow = p.discountAmount > 0 
    ? `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #4B5563; font-size: 13px;">
        <span>Promo savings</span>
        <span style="color: #10B981; font-weight: 600;">-INR ${parseFloat(p.discountAmount).toFixed(2)}</span>
      </div>` 
    : '';

  const billingName   = p.billingAddress?.fullName   || p.userName  || 'Valued Customer';
  const billingEmail  = p.billingAddress?.email       || p.userEmail || '';
  const billingStreet = p.billingAddress?.streetAddress || '';
  const billingCity   = p.billingAddress?.city        || '';
  const billingPin    = p.billingAddress?.postalCode  || '';
  const billingCntry  = p.billingAddress?.country     || 'India';

  const originalPrice = parseFloat(p.amount || 0) + parseFloat(p.discountAmount || 0);

  const logoSrc = `https://syncsocio.com/SyncSocioLogo.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SyncSocio Order Summary</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); width: 560px; max-width: 560px;">
          
          <!-- BRAND HEADER (Minimalist style) -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px; border-bottom: 1px solid #F3F4F6; vertical-align: middle;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <img src="${logoSrc}" alt="SyncSocio Logo" style="width: 28px; height: 28px; vertical-align: middle; display: inline-block; margin-right: 10px;" />
                    <span style="color: #111827; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; vertical-align: middle;">SyncSocio</span>
                  </td>
                  <td align="right" style="vertical-align: middle; color: #9CA3AF; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">
                    TAX INVOICE / RECEIPT
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ORDER INFO -->
          <tr>
            <td style="padding: 32px 32px 20px 32px;">
              <p style="margin: 0; color: #4B5563; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Order number #${p.invoiceNumber}</p>
              <p style="margin: 4px 0 0 0; color: #9CA3AF; font-size: 11px;">${p.invoiceDate}</p>
              
              <h1 style="margin: 24px 0 8px 0; color: #111827; font-size: 30px; font-weight: 800; tracking: -0.75px;">Order summary</h1>
              <p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.5;">Hi ${billingName.split(' ')[0]},</p>
              <p style="margin: 4px 0 0 0; color: #4B5563; font-size: 14px; line-height: 1.5;">Thank you for choosing SyncSocio. Here's a summary of your order.</p>
            </td>
          </tr>

          <!-- SEPARATOR -->
          <tr>
            <td style="padding: 0 32px;"><hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 0;"/></td>
          </tr>

          <!-- ORDER DETAILS -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 700;">Order details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="35%" style="color: #9CA3AF; font-size: 12px; padding: 4px 0; font-weight: 500;">Transaction ID</td>
                  <td style="color: #4B5563; font-size: 12px; padding: 4px 0; font-weight: 600; font-family: monospace;">${p.razorpayPaymentId || '—'}</td>
                </tr>
                <tr>
                  <td style="color: #9CA3AF; font-size: 12px; padding: 4px 0; font-weight: 500;">Username</td>
                  <td style="color: #4B5563; font-size: 12px; padding: 4px 0; font-weight: 600;">${p.userEmail}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SEPARATOR -->
          <tr>
            <td style="padding: 0 32px;"><hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 0;"/></td>
          </tr>

          <!-- PAYMENT DETAILS -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 700;">Payment details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="35%" style="color: #9CA3AF; font-size: 12px; padding: 4px 0; font-weight: 500;">Payment source</td>
                  <td style="color: #4B5563; font-size: 12px; padding: 4px 0; font-weight: 600;">
                    <span style="display: inline-block; background-color: #EFF6FF; color: #2563EB; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">RAZORPAY</span>
                    Payment Gateway
                  </td>
                </tr>
                <tr>
                  <td style="color: #9CA3AF; font-size: 12px; padding: 4px 0; font-weight: 500;">Initial charge</td>
                  <td style="color: #4B5563; font-size: 12px; padding: 4px 0; font-weight: 600;">INR ${parseFloat(p.amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="color: #9CA3AF; font-size: 12px; padding: 4px 0; font-weight: 500;">Final cost</td>
                  <td style="color: #111827; font-size: 12px; padding: 4px 0; font-weight: 700;">INR ${parseFloat(p.amount).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SEPARATOR -->
          <tr>
            <td style="padding: 0 32px;"><hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 0;"/></td>
          </tr>

          <!-- BILLING ADDRESS SECTION -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 700;">Billing address</h2>
              <div style="color: #4B5563; font-size: 13px; line-height: 1.6;">
                <strong style="color: #111827; font-size: 14px;">${billingName}</strong><br/>
                <span style="color: #6B7280; font-family: monospace;">${billingEmail}</span><br/>
                ${billingStreet ? `${billingStreet}<br/>` : ''}
                ${billingCity || billingPin ? `${[billingCity, billingPin].filter(Boolean).join(' — ')}<br/>` : ''}
                ${billingCntry}
              </div>
            </td>
          </tr>

          <!-- SEPARATOR -->
          <tr>
            <td style="padding: 0 32px;"><hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 0;"/></td>
          </tr>

          <!-- YOUR ITEMS -->
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 700;">Your items</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="36" style="vertical-align: top; padding-top: 2px;">
                    <div style="width: 24px; height: 24px; background-color: #EFF6FF; border-radius: 12px; display: flex; align-items: center; justify-content: center; text-align: center;">
                      <span style="color: #3B82F6; font-size: 12px; line-height: 24px; font-weight: 700;">✓</span>
                    </div>
                  </td>
                  <td style="vertical-align: top;">
                    <div style="color: #111827; font-size: 14px; font-weight: 700;">${p.packMeta.label}</div>
                    <div style="color: #9CA3AF; font-size: 11px; margin-top: 2px;">${p.packMeta.subtitle || 'Active subscription'}</div>
                  </td>
                  <td align="right" style="vertical-align: top; color: #111827; font-size: 14px; font-weight: 700; padding-top: 2px;">
                    INR ${parseFloat(p.amount).toFixed(2)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PRICE SUMMARY BLOCK -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px 32px; border-radius: 0 0 16px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #9CA3AF; font-size: 12px; padding: 4px 0;">Promo code</td>
                  <td align="right" style="color: #4B5563; font-size: 12px; padding: 4px 0; font-weight: 600; font-family: monospace;">${p.couponCode || '—'}</td>
                </tr>
                <tr>
                  <td style="color: #4B5563; font-size: 13px; padding: 8px 0; font-weight: 500;">Subtotal</td>
                  <td align="right" style="color: #4B5563; font-size: 13px; padding: 8px 0; font-weight: 600;">INR ${originalPrice.toFixed(2)}</td>
                </tr>
                ${discountRow}
                <tr>
                  <td style="color: #111827; font-size: 15px; padding: 12px 0 0 0; font-weight: 800; border-top: 1px dashed #E5E7EB;">Total</td>
                  <td align="right" style="padding: 12px 0 0 0; border-top: 1px dashed #E5E7EB;">
                    <span style="color: #9CA3AF; font-size: 13px; text-decoration: line-through; margin-right: 8px;">INR ${originalPrice.toFixed(2)}</span>
                    <span style="color: #111827; font-size: 18px; font-weight: 800;">INR ${parseFloat(p.amount).toFixed(2)}</span>
                  </td>
                </tr>
              </table>

              <!-- DOWNLOAD INVOICE CTA -->
              <div style="margin-top: 32px; text-align: center;">
                <a href="${apiBaseUrl}/api/payment/invoice/${p.transactionId}/download" style="display: inline-block; background-color: #3B82F6; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 99px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);">
                  Download receipt / invoice
                </a>
              </div>
            </td>
          </tr>

        </table>

        <!-- FOOTER BOTTOM -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; text-align: center;">
          <tr>
            <td style="color: #9CA3AF; font-size: 11px; line-height: 1.5; padding: 0 16px;">
              © 2026 SyncSocio<br/>
              This email contains a secure PDF invoice of your transaction. Need support? Email <a href="mailto:support@syncsocio.com" style="color: #3B82F6; text-decoration: none;">support@syncsocio.com</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ─── PDF Document Builder ───────────────────────────────────────────────────
export const generatePDFBuffer = (p) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Colors
      const primaryColor = '#3B82F6';
      const textColor = '#1F2937';
      const lightTextColor = '#6B7280';
      const lightBgColor = '#F9FAFB';
      const borderColor = '#E5E7EB';

      const billingName   = p.billingAddress?.fullName   || p.userName || 'Valued Customer';
      const billingEmail  = p.billingAddress?.email       || p.userEmail || '';
      const billingStreet = p.billingAddress?.streetAddress || '';
      const billingCity   = p.billingAddress?.city        || '';
      const billingPin    = p.billingAddress?.postalCode  || '';
      const billingCntry  = p.billingAddress?.country     || 'India';

      const originalPrice = parseFloat(p.amount || 0) + parseFloat(p.discountAmount || 0);

      // ─── BRAND HEADER (Minimalist Layout) ───────────────────────────────────
      let logoPath = path.join(__dirname, '../../frontend/public/SyncSocioLogo.png');
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), '../frontend/public/SyncSocioLogo.png');
      }
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), 'frontend/public/SyncSocioLogo.png');
      }

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 30, { width: 32 });
      }

      doc.fillColor(textColor)
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('SyncSocio', 95, 30);

      doc.fontSize(12)
         .fillColor(lightTextColor)
         .font('Helvetica-Bold')
         .text('TAX INVOICE / RECEIPT', 400, 38, { align: 'right' });

      // Divider below header
      doc.moveTo(50, 85).lineTo(545, 85).strokeColor(borderColor).stroke();

      // ─── INVOICE DETAILS BLOCK ───────────────────────────────────────────────
      doc.y = 110;
      
      // Left Column: Invoice Meta
      doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('Invoice Details', 50, 110);
      doc.fillColor(lightTextColor).font('Helvetica').fontSize(9).text('Invoice No:', 50, 128);
      doc.fillColor(textColor).font('Helvetica-Bold').text(p.invoiceNumber, 120, 128);

      doc.fillColor(lightTextColor).font('Helvetica').text('Date:', 50, 143);
      doc.fillColor(textColor).font('Helvetica-Bold').text(p.invoiceDate, 120, 143);

      doc.fillColor(lightTextColor).font('Helvetica').text('Payment ID:', 50, 158);
      doc.fillColor(textColor).font('Helvetica-Bold').text(p.razorpayPaymentId || '—', 120, 158);

      doc.fillColor(lightTextColor).font('Helvetica').text('Order ID:', 50, 173);
      doc.fillColor(textColor).font('Helvetica-Bold').text(p.razorpayOrderId || '—', 120, 173);

      // Right Column: Company Info
      doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('From', 350, 110);
      doc.font('Helvetica').fontSize(9).text('SyncSocio', 350, 128);
      doc.text('AECS Layout, Kundalahalli,', 350, 143);
      doc.text('Bengaluru, Karnataka 560037', 350, 158);

      // Divider
      doc.moveTo(50, 200).lineTo(545, 200).strokeColor(borderColor).stroke();

      // ─── BILLING ADDRESS ─────────────────────────────────────────────────────
      doc.y = 215;
      doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('Billing Address', 50, 215);
      doc.font('Helvetica').fontSize(9).text(billingName, 50, 230);
      doc.fillColor(lightTextColor).text(billingEmail, 50, 245);
      doc.fillColor(textColor);
      if (billingStreet) doc.text(billingStreet, 50, 260);
      if (billingCity || billingPin) doc.text(`${billingCity} — ${billingPin}`, 50, 275);
      doc.text(billingCntry, 50, 290);

      // Divider
      doc.moveTo(50, 315).lineTo(545, 315).strokeColor(borderColor).stroke();

      // ─── ITEMS TABLE ─────────────────────────────────────────────────────────
      doc.y = 330;
      
      // Table Header
      doc.rect(50, 330, 495, 24).fill(lightBgColor);
      doc.rect(50, 330, 495, 24).strokeColor(borderColor).stroke();
      
      doc.fillColor(textColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Item Description', 60, 338);
      doc.text('Qty', 320, 338, { width: 40, align: 'center' });
      doc.text('Credits Added', 380, 338, { width: 70, align: 'center' });
      doc.text('Price', 460, 338, { width: 75, align: 'right' });

      // Table Row Content
      doc.fillColor(textColor).fontSize(9);
      doc.font('Helvetica-Bold').text(`${p.packMeta.label}`, 60, 370);
      doc.font('Helvetica').fillColor(lightTextColor).text(p.packMeta.subtitle || 'Active subscription', 60, 382);
      
      doc.fillColor(textColor);
      doc.text('1', 320, 370, { width: 40, align: 'center' });
      doc.font('Helvetica-Bold').text(p.creditsAdded ? `+${p.creditsAdded}` : '—', 380, 370, { width: 70, align: 'center' });
      doc.font('Helvetica-Bold').text(`INR ${originalPrice.toFixed(2)}`, 460, 370, { width: 75, align: 'right' });

      // Row divider
      doc.moveTo(50, 405).lineTo(545, 405).strokeColor(borderColor).stroke();

      // ─── PRICE SUMMARY BLOCK ─────────────────────────────────────────────────
      let summaryY = 420;
      
      doc.fillColor(lightTextColor).font('Helvetica').text('Subtotal:', 300, summaryY, { width: 150, align: 'right' });
      doc.fillColor(textColor).font('Helvetica-Bold').text(`INR ${originalPrice.toFixed(2)}`, 460, summaryY, { width: 75, align: 'right' });
      
      if (p.discountAmount > 0) {
        summaryY += 18;
        doc.fillColor(lightTextColor).font('Helvetica').text(`Promo Discount (${p.couponCode}):`, 300, summaryY, { width: 150, align: 'right' });
        doc.fillColor('#10B981').font('Helvetica-Bold').text(`-INR ${parseFloat(p.discountAmount).toFixed(2)}`, 460, summaryY, { width: 75, align: 'right' });
      }

      summaryY += 18;
      doc.fillColor(lightTextColor).font('Helvetica').text('Tax (0% GST):', 300, summaryY, { width: 150, align: 'right' });
      doc.fillColor(textColor).font('Helvetica-Bold').text('INR 0.00', 460, summaryY, { width: 75, align: 'right' });

      // Final Divider
      summaryY += 24;
      doc.rect(300, summaryY - 8, 245, 30).fill(lightBgColor);
      doc.rect(300, summaryY - 8, 245, 30).strokeColor(borderColor).stroke();
      
      doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text('Total Amount Paid:', 310, summaryY, { width: 130 });
      doc.fillColor(primaryColor).text(`INR ${parseFloat(p.amount).toFixed(2)}`, 450, summaryY, { width: 85, align: 'right' });

      // ─── SYSTEM DISCLAIMER FOOTER ────────────────────────────────────────────
      doc.y = 720;
      doc.fillColor(lightTextColor)
         .fontSize(8)
         .font('Helvetica')
         .text('This is a system-generated tax invoice and requires no physical signature.', 50, 720, { align: 'center' });
      
      doc.text('SyncSocio • support@syncsocio.com', 50, 735, { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

// ─── Plain-text fallback ──────────────────────────────────────────────────────
const buildText = (p) => {
  return [
    'SyncSocio — Tax Invoice / Receipt',
    `Invoice #: ${p.invoiceNumber}`,
    `Date: ${p.invoiceDate}`,
    '',
    `Billed To:`,
    `${p.billingAddress?.fullName || p.userName}`,
    `${p.billingAddress?.email || p.userEmail}`,
    `${p.billingAddress?.streetAddress || ''}`,
    `${p.billingAddress?.city || ''} — ${p.billingAddress?.postalCode || ''}`,
    `${p.billingAddress?.country || 'India'}`,
    '',
    '─────────────────────────────────────────',
    `ITEM: ${p.packMeta.label} (${p.packMeta.subtitle})`,
    `Credits Added: +${p.creditsAdded}`,
    `TOTAL PAID: INR ${parseFloat(p.amount).toFixed(2)}`,
    '─────────────────────────────────────────',
    `Payment ID: ${p.razorpayPaymentId || '—'}`,
    `Order ID:   ${p.razorpayOrderId   || '—'}`,
    '',
    `Questions? ${COMPANY_ADDRESS.supportEmail}`,
    `© ${new Date().getFullYear()} SyncSocio`,
  ].filter(Boolean).join('\n');
};

// ─── EXPORTED FUNCTION ────────────────────────────────────────────────────────
/**
 * sendInvoiceEmail — send professional tax invoice after successful payment.
 */
export const sendInvoiceEmail = async (opts) => {
  const {
    to, userName, userEmail, billingAddress,
    transactionType, planName, amount,
    creditsAdded = 0, razorpayPaymentId, razorpayOrderId,
    planExpiresAt, couponCode, discountAmount = 0,
    discountPercentage = 0, transactionId,
  } = opts;

  console.log(`[Invoice Email] 🚀 Preparing tax invoice email for recipient: ${to}`);
  console.log(`[Invoice Email] Transaction details: Type=${transactionType}, Plan=${planName || 'N/A'}, Amount=INR ${amount}, Credits=${creditsAdded}`);

  try {
    const invoiceNumber = genInvoiceNo(transactionId);
    const invoiceDate   = fmtDate(new Date());
    const packMeta      = resolvePack(transactionType, planName, creditsAdded);

    const params = {
      invoiceNumber, invoiceDate, userName, userEmail, billingAddress,
      packMeta, amount, creditsAdded, transactionType, razorpayPaymentId,
      razorpayOrderId, planExpiresAt, couponCode, discountAmount, discountPercentage,
      transactionId,
    };

    const typeLabel = {
      topup: 'Credit Top-up', plan_purchase: 'Plan Purchase',
      plan_upgrade: 'Plan Upgrade', plan_renewal: 'Plan Renewal',
      dm_addon_purchase: 'DM Automation Add-on'
    }[transactionType] || 'Purchase';

    if (!process.env.SENDGRID_API_KEY) {
      console.error('[Invoice Email] ❌ SENDGRID_API_KEY is missing in environmental variables.');
      throw new Error('SENDGRID_API_KEY missing for invoice email.');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    console.log(`[Invoice Email] 📄 Generating invoice PDF buffer (Invoice No: ${invoiceNumber})...`);
    const pdfBuffer = await generatePDFBuffer(params);
    console.log(`[Invoice Email] ✅ PDF buffer generated successfully. Size: ${pdfBuffer.length} bytes.`);

    const attachments = [
      {
        content: pdfBuffer.toString('base64'),
        filename: `invoice_${invoiceNumber}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      }
    ];

    const msg = {
      to,
      from: `SyncSocio Billing <${process.env.SMTP_FROM_EMAIL || 'admin@syncsocio.com'}>`,
      subject: `Invoice ${invoiceNumber} — ${typeLabel} · INR ${parseFloat(amount).toFixed(2)} Confirmed`,
      text: buildText(params),
      html: buildHTML(params),
      attachments
    };

    console.log(`[Invoice Email] ✉️ Dispatching mail via SendGrid API...`);
    const res = await sgMail.send(msg);
    console.log(`[Invoice Email] 🎉 Invoice email successfully dispatched! SendGrid Response status:`, res?.[0]?.statusCode || 'OK');
    return res;
  } catch (err) {
    console.error(`[Invoice Email] ❌ Execution failed! Error details:`, err);
    throw err;
  }
};

const buildFailedHTML = (p) => {
  const logoSrc = `https://syncsocio.com/SyncSocioLogo.png`;
  const dashUrl = (process.env.FRONTEND_BASE_URL || 'https://syncsocio.com').replace(/\/+$/, '');
  const typeLabel = {
    topup: 'Credit Top-up', plan_purchase: 'Plan Purchase',
    plan_upgrade: 'Plan Upgrade', plan_renewal: 'Plan Renewal',
    dm_addon_purchase: 'DM Automation Add-on'
  }[p.transactionType] || 'Purchase';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - SyncSocio</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); width: 560px; max-width: 560px;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px; border-bottom: 1px solid #F3F4F6; vertical-align: middle;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <img src="${logoSrc}" alt="SyncSocio Logo" style="width: 28px; height: 28px; vertical-align: middle; display: inline-block; margin-right: 10px;" />
                    <span style="color: #111827; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; vertical-align: middle;">SyncSocio</span>
                  </td>
                  <td align="right" style="vertical-align: middle; color: #EF4444; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">
                    PAYMENT FAILED
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FAIL MESSAGE -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: #FEF2F2; border-radius: 24px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: #EF4444; font-size: 24px; font-weight: bold; line-height: 48px;">✕</span>
              </div>
              <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 800;">Transaction Declined / Failed</h2>
              <p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.6;">
                We were unable to process your payment of <strong>INR ${parseFloat(p.amount).toFixed(2)}</strong> for the <strong>${p.planName || typeLabel}</strong>. 
                Don't worry, no funds were deducted from your account. If any amount was temporarily debited, it will be automatically refunded by your bank within 3-5 business days.
              </p>
            </td>
          </tr>

          <!-- ORDER DETAILS -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; padding: 20px; border-radius: 12px; border: 1px solid #F3F4F6;">
                <tr>
                  <td width="40%" style="color: #6B7280; font-size: 12px; padding: 4px 0; font-weight: 500;">Payment Gateway</td>
                  <td style="color: #111827; font-size: 12px; padding: 4px 0; font-weight: 600;">RAZORPAY</td>
                </tr>
                <tr>
                  <td style="color: #6B7280; font-size: 12px; padding: 4px 0; font-weight: 500;">Order ID</td>
                  <td style="color: #111827; font-size: 12px; padding: 4px 0; font-weight: 600; font-family: monospace;">${p.razorpayOrderId || '—'}</td>
                </tr>
                ${p.razorpayPaymentId ? `
                <tr>
                  <td style="color: #6B7280; font-size: 12px; padding: 4px 0; font-weight: 500;">Payment ID</td>
                  <td style="color: #111827; font-size: 12px; padding: 4px 0; font-weight: 600; font-family: monospace;">${p.razorpayPaymentId}</td>
                </tr>` : ''}
                <tr>
                  <td style="color: #6B7280; font-size: 12px; padding: 4px 0; font-weight: 500;">Attempt Date</td>
                  <td style="color: #111827; font-size: 12px; padding: 4px 0; font-weight: 600;">${p.invoiceDate}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- RETRY ACTION -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #4B5563; font-size: 13px;">Please verify your payment details and try again.</p>
              <a href="${dashUrl}/dashboard/buy-credits" style="display: inline-block; background-color: #EF4444; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 99px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
                Retry Payment
              </a>
            </td>
          </tr>

        </table>

        <!-- FOOTER -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; text-align: center;">
          <tr>
            <td style="color: #9CA3AF; font-size: 11px; line-height: 1.5; padding: 0 16px;">
              © 2026 SyncSocio<br/>
              Need assistance? Contact us at <a href="mailto:support@syncsocio.com" style="color: #EF4444; text-decoration: none;">support@syncsocio.com</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendPaymentFailedEmail = async (opts) => {
  const { to, userName, userEmail, transactionType, planName, amount, razorpayPaymentId, razorpayOrderId, transactionId } = opts;
  
  console.log(`[Invoice Email] 🚨 Preparing payment failed email for recipient: ${to}`);
  
  try {
    const invoiceDate = fmtDate(new Date());
    const params = {
      invoiceDate, userName, userEmail, transactionType, planName, amount, razorpayPaymentId, razorpayOrderId, transactionId
    };

    if (!process.env.SENDGRID_API_KEY) {
      console.error('[Invoice Email] ❌ SENDGRID_API_KEY is missing in environmental variables.');
      throw new Error('SENDGRID_API_KEY missing for invoice email.');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to,
      from: `SyncSocio Billing <${process.env.SMTP_FROM_EMAIL || 'admin@syncsocio.com'}>`,
      subject: `Payment Failed ❌ Order Attempt for ${planName || 'Credits'} Declined`,
      html: buildFailedHTML(params)
    };

    console.log(`[Invoice Email] ✉️ Dispatching failure mail via SendGrid API...`);
    const res = await sgMail.send(msg);
    console.log(`[Invoice Email] 🚨 Failure email successfully dispatched! Status:`, res?.[0]?.statusCode || 'OK');
    return res;
  } catch (err) {
    console.error(`[Invoice Email] ❌ Failure email failed to send:`, err);
    throw err;
  }
};
