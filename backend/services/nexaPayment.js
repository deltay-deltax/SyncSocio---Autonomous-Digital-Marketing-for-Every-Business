/**
 * nexaPayment.js
 * Payment link generation for Nexa.
 * Supports: Razorpay (brand's own keys), UPI (manual), Bank Transfer (manual), COD.
 * 
 * IMPORTANT: Always uses the BRAND's own Razorpay credentials, never SyncSocio's.
 * This keeps SyncSocio outside RBI's Payment Aggregator rules.
 */

import crypto from 'crypto';
import Razorpay from 'razorpay';
import BrandProfile from '../models/BrandProfile.js';
import NexaConversation from '../models/NexaConversation.js';
import { sendStandardMessageExternal, resolvePageToken } from '../controllers/instagramWebhookController.js';

// ─── Encryption helpers (AES-256-GCM) ────────────────────────────────────────
const ALGO = 'aes-256-gcm';

const getEncKey = () => {
  const key = process.env.NEXA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback_key_32chars_padding_ok!';
  // Derive 32 bytes via SHA-256 so any length key works
  return crypto.createHash('sha256').update(key).digest();
};

export const encryptField = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getEncKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
  });
};

export const decryptField = (encryptedStr) => {
  if (!encryptedStr) return null;
  try {
    const { iv, authTag, ciphertext } = JSON.parse(encryptedStr);
    const decipher = crypto.createDecipheriv(ALGO, getEncKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    console.error('[NexaPayment] Decryption failed:', e.message);
    return null;
  }
};

// ─── Razorpay Payment Link ────────────────────────────────────────────────────
export const generateRazorpayLink = async ({ brandDoc, nexaSettings, amountRupees, customerName, phone, description, conversationId }) => {
  if (!nexaSettings?.razorpay_key_id || !nexaSettings?.razorpay_key_secret) {
    throw new Error('Brand has not connected Razorpay yet');
  }

  const keyId     = decryptField(nexaSettings.razorpay_key_id);
  const keySecret = decryptField(nexaSettings.razorpay_key_secret);

  if (!keyId || !keySecret) throw new Error('Failed to decrypt Razorpay credentials');

  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const link = await instance.paymentLink.create({
    amount: Math.round(amountRupees * 100), // paise
    currency: 'INR',
    accept_partial: false,
    description: description || 'Order via Instagram DM',
    customer: {
      name: customerName || 'Customer',
      contact: phone || '',
    },
    notify: { sms: true, email: false },
    reminder_enable: true,
    callback_url: `${process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || process.env.WEBHOOK_PUBLIC_URL || 'https://syncsocio.com'}/api/nexa/razorpay-webhook/${brandDoc._id}`,
    callback_method: 'get',
    notes: { nexa_conversation_id: String(conversationId) },
  });

  // Update conversation with payment details
  await NexaConversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        'payment.provider': 'razorpay',
        'payment.razorpay_link_id': link.id,
        'payment.razorpay_short_url': link.short_url,
        'payment.link_generated_at': new Date(),
        'payment.payment_status': 'pending',
        'payment.amount_paise': Math.round(amountRupees * 100),
      },
    }
  );

  console.log(`[NexaPayment] Razorpay link generated: ${link.short_url}`);
  return { razorpay_link_id: link.id, razorpay_short_url: link.short_url };
};

// ─── Razorpay Webhook Verification ───────────────────────────────────────────
export const verifyRazorpayWebhook = async (body, signature, brandDoc, nexaSettings) => {
  if (!nexaSettings?.razorpay_key_secret) return false;
  const secret = decryptField(nexaSettings.razorpay_key_secret);
  if (!secret) return false;

  try {
    return Razorpay.validateWebhookSignature(JSON.stringify(body), signature, secret);
  } catch (e) {
    return false;
  }
};

// ─── Handle Razorpay payment.link.paid event ─────────────────────────────────
export const handleRazorpayPaid = async (body) => {
  try {
    const linkId = body?.payload?.payment_link?.entity?.id;
    if (!linkId) return;

    const convo = await NexaConversation.findOne({ 'payment.razorpay_link_id': linkId });
    if (!convo) {
      console.warn(`[NexaPayment] No conversation found for razorpay_link_id: ${linkId}`);
      return;
    }

    await NexaConversation.updateOne(
      { _id: convo._id },
      {
        $set: {
          stage: 'CLOSED',
          'payment.payment_status': 'paid',
          'payment.paid_at': new Date(),
        },
      }
    );

    // Notify brand owner
    try {
      const { createNotification } = await import('../utils/notificationHelper.js');
      const collected = convo.collected;
      await createNotification(
        convo.user,
        'success',
        '💰 Nexa: Order Paid!',
        `${collected?.customer_name || 'A customer'} just paid for ${collected?.product_interested || 'an order'} ✅ ` +
        `Amount: ₹${collected?.price_agreed || '?'} | Address: ${collected?.delivery_address || 'N/A'} | Phone: ${collected?.phone_number || 'N/A'}`
      );
    } catch (e) {
      console.error('[NexaPayment] Failed to send notification for paid order:', e.message);
    }

    // Auto-reply to the customer on Instagram or WhatsApp
    try {
      const brand = await BrandProfile.findById(convo.brand_id);
      if (brand) {
        const textMsg = `🎉 Payment received! Thank you so much for your order.\n\nYour payment of ₹${convo.collected?.price_agreed} for ${convo.collected?.product_interested} is confirmed. Our team will process this right away!\n\n📦 Order Details:\nItem: ${convo.collected?.product_interested || 'N/A'} (x${convo.collected?.quantity || 1})\nName: ${convo.collected?.customer_name || 'N/A'}\nAddress: ${convo.collected?.delivery_address || 'N/A'}\nPhone: ${convo.collected?.phone_number || 'N/A'}`;

        if (convo.platform === 'whatsapp') {
          if (brand.whatsappAccessToken && brand.whatsappPhoneId) {
            const axios = (await import('axios')).default;
            await axios.post(
              `https://graph.facebook.com/v25.0/${brand.whatsappPhoneId}/messages`,
              {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: convo.ig_user_id,
                type: 'text',
                text: { body: textMsg }
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${brand.whatsappAccessToken}`,
                }
              }
            );
            console.log(`[NexaPayment] Sent auto-reply to ${convo.ig_user_id} via WhatsApp for paid order.`);
          }
        } else {
          const pageToken = await resolvePageToken(brand);
          if (pageToken) {
            await sendStandardMessageExternal({
              pageToken,
              igScopedId: convo.ig_user_id,
              messagePayload: { text: textMsg },
              pageId: brand.instagramPageId,
            });
            console.log(`[NexaPayment] Sent auto-reply to ${convo.ig_user_id} via Instagram for paid order.`);
          }
        }
      }
    } catch (msgErr) {
      console.error('[NexaPayment] Failed to send auto-reply to customer:', msgErr?.response?.data || msgErr.message);
    }

    console.log(`[NexaPayment] ✅ Payment confirmed for conversation ${convo._id}`);
  } catch (err) {
    console.error('[NexaPayment] handleRazorpayPaid error:', err.message);
  }
};

// ─── Get Nexa settings from brand profile ────────────────────────────────────
export const getNexaSettings = (brandDoc) => {
  return brandDoc?.nexa || null;
};
