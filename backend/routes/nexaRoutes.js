/**
 * nexaRoutes.js
 * Routes for Nexa DM agent:
 *  - GET  /api/nexa/settings          — get brand's Nexa config
 *  - POST /api/nexa/settings          — save/update Nexa config
 *  - GET  /api/nexa/conversations     — list conversations for brand owner
 *  - POST /api/nexa/razorpay-webhook/:brandId — Razorpay payment.link.paid event
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import BrandProfile from '../models/BrandProfile.js';
import NexaConversation from '../models/NexaConversation.js';
import { encryptField, verifyRazorpayWebhook, handleRazorpayPaid } from '../services/nexaPayment.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload.js';

const router = express.Router();

// Helper to strictly get the active brand
async function getActiveBrand(req) {
  let brand;
  if (req.user.activeBrandId) {
    brand = await BrandProfile.findOne({ _id: req.user.activeBrandId, user: req.user._id });
  }
  if (!brand) {
    brand = await BrandProfile.findOne({ user: req.user._id });
  }
  return brand;
}

// ─── GET /api/nexa/settings ───────────────────────────────────────────────────
router.get('/settings', protect, async (req, res) => {
  try {
    const brand = await getActiveBrand(req);

    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    // Mask secrets before returning
    const settings = { ...(brand.nexa || {}) };
    if (settings.razorpay_key_secret) settings.razorpay_key_secret = '••••••••••••';
    if (settings.razorpay_key_id && settings.razorpay_key_id.startsWith('{')) {
      // it's encrypted — just show a masked version
      settings.razorpay_key_id = '••••••••••••';
    }

    res.json({ settings, brandName: brand.brandName });
  } catch (err) {
    console.error('[NexaRoutes] GET settings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/nexa/settings ──────────────────────────────────────────────────
router.post('/settings', protect, async (req, res) => {
  try {
    const {
      nexa_enabled,
      razorpay_key_id,
      razorpay_key_secret,
      cod_enabled,
      upi_id,
      bank_details,
      min_discount,
      max_discount,
      upi_qr_code_url,
    } = req.body;

    const brand = await getActiveBrand(req);

    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    // Build nexa update object
    const nexaUpdate = {};

    if (typeof nexa_enabled === 'boolean') nexaUpdate['nexa.nexa_enabled'] = nexa_enabled;
    if (typeof cod_enabled  === 'boolean') nexaUpdate['nexa.cod_enabled']  = cod_enabled;
    if (upi_id  !== undefined) nexaUpdate['nexa.upi_id']  = upi_id || '';
    if (bank_details !== undefined) nexaUpdate['nexa.bank_details'] = bank_details || '';
    if (min_discount !== undefined) nexaUpdate['nexa.min_discount'] = Number(min_discount) || 0;
    if (max_discount !== undefined) nexaUpdate['nexa.max_discount'] = Number(max_discount) || 10;

    // Only encrypt & update Razorpay keys if new values are provided (not masked placeholders)
    if (razorpay_key_id && !razorpay_key_id.startsWith('•')) {
      nexaUpdate['nexa.razorpay_key_id'] = encryptField(razorpay_key_id.trim());
      nexaUpdate['nexa.razorpay_connected'] = true;
    }
    if (razorpay_key_secret && !razorpay_key_secret.startsWith('•')) {
      nexaUpdate['nexa.razorpay_key_secret'] = encryptField(razorpay_key_secret.trim());
    }

    // Process UPI QR Code Upload
    if (upi_qr_code_url !== undefined) {
      if (upi_qr_code_url && !upi_qr_code_url.startsWith('http')) {
        // It's a new base64 image, upload it
        try {
          if (brand.nexa?.upi_qr_code_url && brand.nexa.upi_qr_code_url.startsWith('http')) {
            await deleteFromCloudinary(brand.nexa.upi_qr_code_url).catch(() => {});
          }
          nexaUpdate['nexa.upi_qr_code_url'] = await uploadBase64ToCloudinary(upi_qr_code_url, 'syncsocio/nexa');
        } catch (uploadErr) {
          console.error('[NexaRoutes] Failed to upload QR code to Cloudinary:', uploadErr);
          // If upload fails, just don't update the field
        }
      } else {
        // Just saving the existing URL, or clearing it if empty
        nexaUpdate['nexa.upi_qr_code_url'] = upi_qr_code_url || '';
      }
    }

    await BrandProfile.updateOne({ _id: brand._id }, { $set: nexaUpdate });

    res.json({ success: true, message: 'Nexa settings saved successfully' });
  } catch (err) {
    console.error('[NexaRoutes] POST settings error:', err);
    res.status(500).json({ message: 'Server error saving Nexa settings' });
  }
});

// ─── GET /api/nexa/conversations ─────────────────────────────────────────────
router.get('/conversations', protect, async (req, res) => {
  try {
    const brands = await BrandProfile.find({ user: req.user._id }).select('_id').lean();
    if (!brands.length) return res.status(404).json({ message: 'No brands found for user' });

    const brandIds = brands.map(b => b._id);

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const stage = req.query.stage; // optional filter

    const query = { brand_id: { $in: brandIds } };
    if (stage) query.stage = stage;

    const [conversations, total] = await Promise.all([
      NexaConversation.find(query)
        .select('ig_user_id stage origin collected payment escalate_to_human nudge_sent conversation_history createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NexaConversation.countDocuments(query),
    ]);

    res.json({ conversations, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[NexaRoutes] GET conversations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/nexa/conversations/:id ─────────────────────────────────────────
router.get('/conversations/:id', protect, async (req, res) => {
  try {
    const brands = await BrandProfile.find({ user: req.user._id }).select('_id').lean();
    const brandIds = brands.map(b => b._id);

    const convo = await NexaConversation.findOne({
      _id: req.params.id,
      brand_id: { $in: brandIds },
    }).lean();

    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    res.json(convo);
  } catch (err) {
    console.error('[NexaRoutes] GET conversation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/nexa/razorpay-webhook/:brandId ─────────────────────────────────
// Handles the redirect after successful payment on Razorpay checkout
router.get('/razorpay-webhook/:brandId', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Payment Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; }
          .card { text-align: center; padding: 2.5rem; background: white; border-radius: 1.5rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); max-width: 90%; }
          .icon { font-size: 64px; margin-bottom: 1rem; }
          h2 { color: #111827; margin-top: 0; margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 700; }
          p { color: #4b5563; margin-bottom: 1.5rem; font-size: 1rem; line-height: 1.5; }
          .btn { display: inline-block; padding: 0.75rem 1.5rem; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 9999px; font-weight: 600; transition: background-color 0.2s; }
          .btn:hover { background-color: #4338ca; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>Payment Successful!</h2>
          <p>Thank you for your order. Your payment has been securely processed.</p>
          <p style="font-size: 0.875rem; margin-bottom: 0;">You can safely close this window and return to Instagram.</p>
        </div>
      </body>
    </html>
  `);
});

// ─── POST /api/nexa/razorpay-webhook/:brandId ─────────────────────────────────
// Register this URL in each brand's Razorpay dashboard
router.post('/razorpay-webhook/:brandId', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const brand = await BrandProfile.findById(req.params.brandId).select('nexa user').lean();
    if (!brand) return res.status(400).send('Brand not found');

    const signature = req.headers['x-razorpay-signature'];
    const bodyStr = req.body.toString('utf8');
    let bodyJson;
    try { bodyJson = JSON.parse(bodyStr); } catch { return res.status(400).send('Invalid JSON'); }

    const isValid = await verifyRazorpayWebhook(bodyJson, signature, brand, brand.nexa);
    if (!isValid) {
      console.warn('[NexaRoutes] Razorpay webhook signature mismatch for brand:', req.params.brandId);
      return res.status(400).send('Invalid signature');
    }

    if (bodyJson.event === 'payment_link.paid') {
      await handleRazorpayPaid(bodyJson);
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('[NexaRoutes] Razorpay webhook error:', err.message);
    res.status(500).send('Error');
  }
});

export default router;
