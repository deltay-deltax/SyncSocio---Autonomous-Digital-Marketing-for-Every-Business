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
    const brand = await getActiveBrand(req);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const stage = req.query.stage; // optional filter

    const query = { brand_id: brand._id };
    if (stage) query.stage = stage;

    const [conversations, total] = await Promise.all([
      NexaConversation.find(query)
        .select('ig_user_id stage origin collected payment escalate_to_human nudge_sent createdAt updatedAt')
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
    const brand = await BrandProfile.findOne({
      $or: [{ user: req.user._id, _id: req.user.activeBrandId }, { user: req.user._id }],
    }).select('_id').lean();

    const convo = await NexaConversation.findOne({
      _id: req.params.id,
      brand_id: brand?._id,
    }).lean();

    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    res.json(convo);
  } catch (err) {
    console.error('[NexaRoutes] GET conversation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
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
