import express from 'express';
import sgMail from '@sendgrid/mail';
import { protect } from '../middleware/authMiddleware.js';
import EmailList from '../models/EmailList.js';
import PhoneList from '../models/PhoneList.js';
import BrandProfile from '../models/BrandProfile.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notificationHelper.js';

// ── Email Quota Helper ────────────────────────────────────────────────────────
const EMAIL_QUOTAS = { starter: 500, elite: 2000 };

function getPlanQuota(plan = '') {
  const p = plan.toLowerCase();
  if (p.includes('elite')) return EMAIL_QUOTAS.elite;
  if (p.includes('starter') || p.includes('brand')) return EMAIL_QUOTAS.starter;
  return 0; // Free / no plan
}

async function checkAndResetQuota(user) {
  const now = new Date();
  const resetAt = new Date(user.email_quota_reset_at || 0);
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    user.email_sends_this_month = 0;
    user.email_quota_reset_at = now;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

// Get all email lists for the user
router.get('/lists', protect, async (req, res) => {
  try {
    const lists = await EmailList.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(lists);
  } catch (error) {
    console.error('Error fetching email lists:', error);
    res.status(500).json({ message: 'Server error fetching email lists' });
  }
});

// Save a new email list
router.post('/lists', protect, async (req, res) => {
  const { name, emails } = req.body;
  try {
    if (!name || !emails || !emails.length) {
      return res.status(400).json({ message: 'Name and emails are required' });
    }

    // Check if list with same name already exists for user
    let emailList = await EmailList.findOne({ user: req.user._id, name: name.trim() });
    if (emailList) {
      // Update existing list by adding unique new emails
      const combined = Array.from(new Set([...emailList.emails, ...emails]));
      emailList.emails = combined;
      await emailList.save();
    } else {
      // Create new list
      emailList = await EmailList.create({
        user: req.user._id,
        name: name.trim(),
        emails: emails
      });
    }

    await createNotification(
      req.user._id,
      'success',
      'Recipient List Saved',
      `Saved email list "${emailList.name}" with ${emailList.emails.length} contacts.`
    );

    res.status(201).json(emailList);
  } catch (error) {
    console.error('Error saving email list:', error);
    res.status(500).json({ message: 'Server error saving email list' });
  }
});

// Get all phone lists for the user
router.get('/phone-lists', protect, async (req, res) => {
  try {
    const lists = await PhoneList.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(lists);
  } catch (error) {
    console.error('Error fetching phone lists:', error);
    res.status(500).json({ message: 'Server error fetching phone lists' });
  }
});

// Save a new phone list
router.post('/phone-lists', protect, async (req, res) => {
  const { name, phones } = req.body;
  try {
    if (!name || !phones || !phones.length) {
      return res.status(400).json({ message: 'Name and phones are required' });
    }

    // Check if list with same name already exists for user
    let phoneList = await PhoneList.findOne({ user: req.user._id, name: name.trim() });
    if (phoneList) {
      // Update existing list by adding unique new phones
      const combined = Array.from(new Set([...phoneList.phones, ...phones]));
      phoneList.phones = combined;
      await phoneList.save();
    } else {
      // Create new list
      phoneList = await PhoneList.create({
        user: req.user._id,
        name: name.trim(),
        phones: phones
      });
    }

    await createNotification(
      req.user._id,
      'success',
      'Recipient List Saved',
      `Saved phone list "${phoneList.name}" with ${phoneList.phones.length} contacts.`
    );

    res.status(201).json(phoneList);
  } catch (error) {
    console.error('Error saving phone list:', error);
    res.status(500).json({ message: 'Server error saving phone list' });
  }
});

// ── GET /campaigns/email-quota ── returns current usage for the UI bar
router.get('/email-quota', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    await checkAndResetQuota(user);
    await user.save();
    const limit = getPlanQuota(user.plan);
    const used = user.email_sends_this_month || 0;
    const nextReset = new Date(user.email_quota_reset_at || Date.now());
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);
    res.json({
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: nextReset.toISOString(),
      plan: user.plan || 'free'
    });
  } catch (err) {
    console.error('[EmailQuota] Error fetching quota:', err);
    res.status(500).json({ message: 'Failed to fetch email quota' });
  }
});

// Send email campaign
router.post('/send', protect, async (req, res) => {
  const { recipients, subject, body, image } = req.body;
  try {
    if (!recipients || !recipients.length || !subject || !body) {
      return res.status(400).json({ message: 'Recipients, subject, and body are required' });
    }

    const isHtml = body.includes('<') && (body.includes('</') || body.includes('/>'));
    const cleanBody = isHtml ? body.replace(/[\r\n]+/g, ' ').replace(/>\s+</g, '><').trim() : body;

    // ── EMAIL QUOTA GUARD ────────────────────────────────────────────────────
    const sendingUser = await User.findById(req.user._id);
    await checkAndResetQuota(sendingUser);
    const quota = getPlanQuota(sendingUser.plan);
    if (quota === 0) {
      return res.status(403).json({
        code: 'NO_EMAIL_PLAN',
        message: 'Upgrade to a Starter or Elite plan to send email campaigns.'
      });
    }
    const alreadySent = sendingUser.email_sends_this_month || 0;
    const toSend = recipients.length;
    if (alreadySent + toSend > quota) {
      return res.status(429).json({
        code: 'EMAIL_QUOTA_EXCEEDED',
        message: `Monthly email limit reached. You've used ${alreadySent} of ${quota} emails this month. You can send ${Math.max(0, quota - alreadySent)} more.`,
        used: alreadySent,
        limit: quota,
        remaining: Math.max(0, quota - alreadySent)
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    const brandName = profile?.brandName || 'SyncSocio';

    // ── DOMAIN VERIFICATION GUARD ────────────────────────────────────────────
    let fromEmail = profile.email_from;

    if (profile?.use_generic_email_sender) {
      fromEmail = 'creatives@syncsocio.com';
    } else if (!profile?.email_domain_verified) {
      return res.status(403).json({
        code: 'EMAIL_DOMAIN_NOT_VERIFIED',
        message: 'Your email domain is not verified yet. Please complete email setup before sending campaigns.',
        action: 'Go to Settings → Email Setup'
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Verify SendGrid API Key is configured
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ message: 'SendGrid API Key not configured on server' });
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    console.log("[CampaignSend] Received image starts with:", image ? image.substring(0, 50) : "UNDEFINED/NULL");

    const hasBase64Image = typeof image === 'string' && image.startsWith('data:');
    const hasHttpImage = typeof image === 'string' && image.startsWith('http');
    const hasImage = hasBase64Image || hasHttpImage;

    const imgTag = hasBase64Image
      ? '<img src="cid:campaign-hero" style="width: 100%; border-radius: 12px; margin-bottom: 20px; display: block;" />'
      : (hasHttpImage ? `<img src="${image}" style="width: 100%; border-radius: 12px; margin-bottom: 20px; display: block;" />` : '');

    // Throttled/sequential sending helper to mimic professional campaign blasting
    const sendWithThrottle = async () => {
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        const mailOptions = {
          // ── CHANGED: Use brand's verified from address ──
          from: {
            email: fromEmail,   // e.g. hello@minimalist.in
            name: brandName     // e.g. Minimalist
          },
          // ───────────────────────────────────────────────
          to: recipient,
          subject: subject,
          html: isHtml
            ? `<div style="max-width: 600px; margin: 0 auto; padding: 10px;">${hasImage ? imgTag : ''}${cleanBody}</div>`
            : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
              ${imgTag}
              <div style="font-size: 14px; line-height: 1.6; color: #1a202c; white-space: pre-wrap;">${cleanBody}</div>
              <div style="margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 15px; font-size: 10px; color: #a0aec0; text-align: center;">
                Sent via ${brandName} | Auto-generated Campaign
              </div>
            </div>
          `.replace(/[\r\n]+/g, ' ').replace(/>\s+</g, '><').trim(),
          attachments: hasBase64Image ? [{
            filename: 'hero.jpg',
            content: image.split(',')[1],
            type: image.match(/data:(.*?);/)?.[1] || 'image/jpeg',
            disposition: 'inline',
            content_id: 'campaign-hero'
          }] : undefined
        };

        try {
          await sgMail.send(mailOptions);
        } catch (err) {
          console.error(`Failed sending to ${recipient}:`, err.response?.body || err.message);
        }

        // 300ms gap between individual sends to stay within limits
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

    // Increment quota counter before async send (ensures count is accurate)
    sendingUser.email_sends_this_month = alreadySent + toSend;
    await sendingUser.save();

    // Trigger async throttled sending sequence
    sendWithThrottle().then(async () => {
      console.log(`Campaign completed sending to ${recipients.length} recipients.`);
      await createNotification(
        req.user._id,
        'success',
        'Email Campaign Sent',
        `Successfully sent "${subject}" to ${recipients.length} recipients.`
      );
    });

    res.status(200).json({ success: true, message: 'Email campaign blast triggered successfully' });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ message: 'Server error sending email campaign' });
  }
});


import axios from 'axios';
import FormData from 'form-data';

// Send WhatsApp campaign
router.post('/send-whatsapp', protect, async (req, res) => {
  const { recipients, body, image, subject } = req.body;
  try {
    if (!recipients || !recipients.length || !body) {
      return res.status(400).json({ message: 'Recipients and body are required' });
    }

    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    const WHATSAPP_ACCESS_TOKEN = profile?.whatsappAccessToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const WHATSAPP_PHONE_NUMBER_ID = profile?.whatsappPhoneId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || WHATSAPP_ACCESS_TOKEN === 'your_token_here') {
      return res.status(500).json({ message: 'WhatsApp API credentials not configured in your profile or backend' });
    }

    let mediaId = null;

    // If an image is provided as base64, we need to upload it to Meta first to get a media ID
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
      try {
        // Extract the mime type and base64 data
        const matches = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          // Meta only supports certain image types for WhatsApp
          const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const form = new FormData();
          
          // WhatsApp API requires the file and type
          form.append('file', buffer, { filename: `campaign_image.${ext}`, contentType: mimeType });
          form.append('type', mimeType);
          form.append('messaging_product', 'whatsapp');

          const mediaRes = await axios.post(
            `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/media`,
            form,
            {
              headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              },
            }
          );

          mediaId = mediaRes.data.id;
        }
      } catch (mediaErr) {
        console.error('Error uploading media to WhatsApp:', mediaErr?.response?.data || mediaErr.message);
        // Fallback to sending without image if upload fails, or throw error
        // return res.status(500).json({ message: 'Failed to upload image to WhatsApp API' });
      }
    }

    // Combine subject and body for the message
    const messageText = subject ? `*${subject}*\n\n${body}` : body;

    let successCount = 0;
    let failCount = 0;
    let lastError = null;

    const sendWithThrottle = async () => {
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i].replace('+', ''); // WhatsApp API expects number without '+'
        
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
        };

        // Use the generic template created during connect
        payload.type = 'template';
        payload.template = {
          name: 'custom_campaign_image',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: messageText }
              ]
            }
          ]
        };

        const headerImageParam = mediaId
          ? { type: 'image', image: { id: mediaId } }
          : (image && typeof image === 'string' && image.startsWith('http'))
          ? { type: 'image', image: { link: image } }
          : { type: 'image', image: { link: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e' } };

        payload.template.components.unshift({
          type: 'header',
          parameters: [ headerImageParam ]
        });

        try {
          await axios.post(
            `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              },
            }
          );
          console.log(`[WhatsApp] Sent successfully to ${recipient}`);
          successCount++;
        } catch (err) {
          const errCode = err?.response?.data?.error?.code;
          if (errCode === 132001) {
            console.log(`[WhatsApp] Primary template not found, attempting fallback template 'custom_campaign_text'...`);
            try {
              const fallbackPayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipient,
                type: 'template',
                template: {
                  name: 'custom_campaign_text',
                  language: { code: 'en' },
                  components: [
                    { type: 'body', parameters: [ { type: 'text', text: messageText } ] }
                  ]
                }
              };
              await axios.post(
                `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
                fallbackPayload,
                { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
              );
              console.log(`[WhatsApp] Fallback template sent successfully to ${recipient}`);
              successCount++;
              continue;
            } catch (fbErr) {
              console.error(`[WhatsApp] Fallback template also failed for ${recipient}:`, fbErr?.response?.data || fbErr.message);
            }
          }

          console.error(`[WhatsApp] Failed sending to ${recipient}:`, err?.response?.data || err.message);
          failCount++;
          lastError = err?.response?.data?.error?.message || err.message;
        }

        // Add slight delay to avoid rate limits
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

    // Trigger async throttled sending sequence
    sendWithThrottle().then(async () => {
      console.log(`WhatsApp Campaign completed. Success: ${successCount}, Failed: ${failCount}`);
      if (successCount > 0) {
        await createNotification(
          req.user._id,
          'success',
          'WhatsApp Campaign Sent',
          `Successfully triggered WhatsApp blast to ${successCount} recipients. ${failCount > 0 ? `(${failCount} failed)` : ''}`
        );
      } else {
        await createNotification(
          req.user._id,
          'alert',
          'WhatsApp Campaign Failed',
          `Blast failed to send to all ${failCount} recipients. Error: ${lastError}`
        );
      }
    });

    res.status(200).json({ success: true, message: 'WhatsApp campaign blast triggered successfully' });
  } catch (error) {
    console.error('Error sending WhatsApp campaign:', error);
    res.status(500).json({ message: 'Server error sending WhatsApp campaign' });
  }
});

export default router;
