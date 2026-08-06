import express from 'express';
import sgMail from '@sendgrid/mail';
import { protect } from '../middleware/authMiddleware.js';
import EmailList from '../models/EmailList.js';
import PhoneList from '../models/PhoneList.js';
import BrandProfile from '../models/BrandProfile.js';
import User from '../models/User.js';
import RequestedTemplate from '../models/RequestedTemplate.js';
import { createNotification } from '../utils/notificationHelper.js';

// ── Email Quota Helper ────────────────────────────────────────────────────────
const EMAIL_QUOTAS = { starter: 0, growth: 500, pro: 2000, agency: 5000 };
function getPlanQuota(plan) {
  const p = (plan || '').toLowerCase();
  if (p.includes('agency')) return EMAIL_QUOTAS.agency;
  if (p.includes('pro')) return EMAIL_QUOTAS.pro;
  if (p.includes('growth')) return EMAIL_QUOTAS.growth;
  return EMAIL_QUOTAS.starter;
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
    const userPlan = (sendingUser.plan || '').toLowerCase();
    if (!userPlan.includes('growth') && !userPlan.includes('pro') && !userPlan.includes('agency')) {
        return res.status(403).json({
          success: false,
          message: 'Upgrade to a Growth or Pro plan to send email campaigns.'
        });
      }
    const quota = getPlanQuota(sendingUser.plan);
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

// ─── AI-powered campaign copy refinement ─────────────────────────────────────
// Calls Gemini to rewrite the user's rough draft into professional,
// industry-appropriate campaign copy based on the brand profile.
async function refineCampaignCopy({ rawSubject, rawBody, profile, templateType }) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) return { refinedSubject: rawSubject, refinedBody: rawBody };

  const industry     = profile?.businessCategory || 'Retail';
  const tone         = profile?.brandTone || 'professional and engaging';
  const audiences    = (profile?.targetAudiences || []).join(', ') || 'customers';
  const usp          = profile?.usp || '';
  const keywords     = profile?.brandKeywords || '';
  const brandName    = profile?.brandName || 'our brand';

  // Map template name to a short campaign type description
  const templateDescriptions = {
    syncsocio_festival: 'festive seasonal promotion',
    syncsocio_promo_image: 'product/collection promotion',
    syncsocio_promo_generic: 'general promotional offer',
    syncsocio_promo_text: 'text-only announcement',
    syncsocio_promo_shop: 'shopping/e-commerce offer',
    syncsocio_promo_claim: 'exclusive deal or coupon',
    syncsocio_promo_visit: 'store visit or location-based offer',
    syncsocio_promo_book: 'appointment or booking promotion',
    syncsocio_promo_order: 'order-related update or promotion',
    syncsocio_promo_learn: 'educational or course promotion',
    syncsocio_promo_get: 'freebie or lead magnet offer',
    syncsocio_promo_lead: 'lead generation or sign-up offer',
    syncsocio_interactive_poll: 'customer poll or feedback request',
  };
  const campaignType = templateDescriptions[templateType] || 'marketing promotion';

  const prompt = `You are an expert WhatsApp marketing copywriter for ${industry} brands.

Brand: ${brandName}
Industry: ${industry}
Brand Tone: ${tone}
Target Audience: ${audiences}
USP: ${usp}
Brand Keywords: ${keywords}
Campaign Type: ${campaignType}

The user gave this rough campaign brief:
Headline: "${rawSubject}"
Body: "${rawBody}"

Rewrite this as a crisp, professional WhatsApp marketing message tailored to this brand's industry and tone.

Return ONLY a valid JSON object with exactly these two keys:
{
  "headline": "<bold attention-grabbing headline, max 55 chars, no quotes, emojis OK>",
  "body": "<sharp campaign body, max 160 chars, no line breaks, no sign-off like Best/Regards/Team, no mention of SyncSocio, no generic filler like 'Hey there' or 'Check out our latest release'>"
}

Rules:
- Match tone exactly: ${tone}
- Be specific to ${industry} industry
- Keep it punchy and action-oriented
- Do NOT invent discounts or offers that were not in the original brief
- Output ONLY the JSON, nothing else`;

  try {
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300, responseMimeType: 'application/json' }
      },
      { timeout: 15000 }
    );

    const raw = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(raw.trim());

    const refinedSubject = (parsed.headline || rawSubject).trim().substring(0, 60);
    const refinedBody    = (parsed.body    || rawBody   ).replace(/[\n\r]+/g, ' ').trim().substring(0, 1024);

    console.log(`[WhatsApp AI] Refined copy — Headline: "${refinedSubject}" | Body: "${refinedBody.substring(0, 80)}..."`); 
    return { refinedSubject, refinedBody };
  } catch (aiErr) {
    console.warn('[WhatsApp AI] Refinement failed, using raw text:', aiErr?.response?.data || aiErr.message);
    return { refinedSubject: rawSubject, refinedBody: rawBody };
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Send WhatsApp campaign
router.post('/send-whatsapp', protect, async (req, res) => {
  const { recipients, body, image, subject, whatsappTemplateName, whatsappUrlParam } = req.body;
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

    // Meta API Error 132018: Template variable cannot contain newlines, tabs, or more than 4 consecutive spaces
    const cleanSubject = (subject || 'Exclusive Offer')
      .replace(/[\n\t\r]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim().substring(0, 60);

    const cleanBody = body
      .replace(/[\n\t\r]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim().substring(0, 1024);

    // ── AI refinement: rewrite rough draft into professional campaign copy ──
    const targetTemplateForAI = whatsappTemplateName || (mediaId || (image && typeof image === 'string' && image.startsWith('http')) ? 'custom_campaign_image' : 'custom_campaign_text');
    let refinedSubject, refinedBody;
    
    if (req.body.whatsappVariables) {
      refinedSubject = req.body.whatsappVariables['1'] || cleanSubject;
      refinedBody = req.body.whatsappVariables['2'] || req.body.whatsappVariables['1'] || cleanBody;
    } else {
      const refined = await refineCampaignCopy({
        rawSubject: cleanSubject,
        rawBody: cleanBody,
        profile,
        templateType: targetTemplateForAI,
      });
      refinedSubject = refined.refinedSubject;
      refinedBody = refined.refinedBody;
    }

    let successCount = 0;
    let failCount = 0;
    let lastError = null;

    // Use the template name from frontend, otherwise default to our auto-created templates based on image presence
    const targetTemplate = whatsappTemplateName || (mediaId || (image && typeof image === 'string' && image.startsWith('http')) ? 'custom_campaign_image' : 'custom_campaign_text');

    // ─── TEMPLATE CATEGORY ROUTING ───────────────────────────────────────────
    // Marketing templates (festival, promo_*): Use {{1}} = headline, {{2}} = body
    const MARKETING_TWO_VAR_TEMPLATES = [
      'syncsocio_v2_festival',
      'syncsocio_v2_promo_image', 'syncsocio_v2_promo_video', 'syncsocio_v2_promo_generic',
      'syncsocio_v2_promo_lead',  'syncsocio_v2_interactive_poll',
      'syncsocio_v2_promo_shop',  'syncsocio_v2_promo_claim', 'syncsocio_v2_promo_visit',
      'syncsocio_v2_promo_book',  'syncsocio_v2_promo_order', 'syncsocio_v2_promo_learn',
      'syncsocio_v2_promo_get',   'syncsocio_v2_promo_text',
    ];

    // Templates that include an IMAGE header component
    const TEMPLATES_WITH_IMAGE_HEADER = [
      'custom_campaign_image',
      'syncsocio_v2_festival',
      'syncsocio_v2_promo_image', 'syncsocio_v2_promo_video', 'syncsocio_v2_promo_generic',
      'syncsocio_v2_promo_lead',
      'syncsocio_v2_promo_shop',  'syncsocio_v2_promo_claim', 'syncsocio_v2_promo_visit',
      'syncsocio_v2_promo_book',  'syncsocio_v2_promo_order', 'syncsocio_v2_promo_learn',
      'syncsocio_v2_promo_get',
    ];

    // Templates that include a dynamic URL button with {{1}}
    const TEMPLATES_WITH_URL_BUTTON = [
      'custom_campaign_image', 'custom_campaign_text',
      'syncsocio_v2_festival',
      'syncsocio_v2_promo_image', 'syncsocio_v2_promo_video', 'syncsocio_v2_promo_generic',
      'syncsocio_v2_promo_lead',
      'syncsocio_v2_promo_shop',  'syncsocio_v2_promo_claim', 'syncsocio_v2_promo_visit',
      'syncsocio_v2_promo_book',  'syncsocio_v2_promo_order', 'syncsocio_v2_promo_learn',
      'syncsocio_v2_promo_get',   'syncsocio_v2_promo_text',
    ];
    // ─────────────────────────────────────────────────────────────────────────

    const isTwoVarMarketing = MARKETING_TWO_VAR_TEMPLATES.includes(targetTemplate);

    const sendWithThrottle = async () => {
      for (let i = 0; i < recipients.length; i++) {
        // Strip non-digit characters. Ensure international format (e.g. 919876543210)
        let recipient = String(recipients[i] || '').replace(/\D/g, '');
        if (!recipient) continue;

        // ── Build body parameters based on template type ──────────────────
        let bodyParams = [];
        if (req.body.whatsappVariables) {
          // Dynamic BYO Templates: Map all variables directly
          const numVars = Object.keys(req.body.whatsappVariables).length;
          for (let v = 1; v <= numVars; v++) {
            if (req.body.whatsappVariables[String(v)]) {
              bodyParams.push({ type: 'text', text: String(req.body.whatsappVariables[String(v)]).substring(0, 1024) });
            }
          }
        } else if (isTwoVarMarketing) {
          // Marketing approved templates: {{1}} = bold headline, {{2}} = campaign copy body
          bodyParams = [
            { type: 'text', text: refinedSubject.substring(0, 60) },   // {{1}} headline — AI refined
            { type: 'text', text: refinedBody.substring(0, 1024) },    // {{2}} body copy — AI refined
          ];
        } else {
          // Legacy custom templates (custom_campaign_image / custom_campaign_text) — single {{1}}
          const combinedMessage = `${refinedSubject}\n\n${refinedBody}`;
          bodyParams = [
            { type: 'text', text: combinedMessage.substring(0, 1024) },
          ];
        }

        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'template',
          template: {
            name: targetTemplate,
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: bodyParams,
              }
            ]
          }
        };

        const headerImageParam = mediaId
          ? { type: 'image', image: { id: mediaId } }
          : (image && typeof image === 'string' && image.startsWith('http'))
          ? { type: 'image', image: { link: image } }
          : { type: 'image', image: { link: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e' } };

        // 1. Add Image Header component if this template has one
        if (TEMPLATES_WITH_IMAGE_HEADER.includes(targetTemplate)) {
          payload.template.components.unshift({
            type: 'header',
            parameters: [ headerImageParam ]
          });
        }

        // 2. Add dynamic URL button parameter if this template has one
        if (TEMPLATES_WITH_URL_BUTTON.includes(targetTemplate)) {
          const urlParamValue = (whatsappUrlParam || 'shop').replace(/[^a-zA-Z0-9\-_/]/g, '') || 'shop';
          payload.template.components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: urlParamValue }
            ]
          });
        }

        try {
          // ── DEBUG: Log the exact payload being sent ──
          console.log(`[WhatsApp DEBUG] Sending to ${recipient} using template "${targetTemplate}" via phoneId ${WHATSAPP_PHONE_NUMBER_ID}`);
          console.log(`[WhatsApp DEBUG] Payload:`, JSON.stringify(payload, null, 2));

          const apiRes = await axios.post(
            `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              },
            }
          );
          // Log the FULL response — check for message_status field
          console.log(`[WhatsApp] Sent successfully to ${recipient}. Full response:`, JSON.stringify(apiRes.data));
          successCount++;
        } catch (err) {
          const errData = err?.response?.data?.error;
          console.error(`[WhatsApp] Failed sending to ${recipient}:`, errData || err.message);
          failCount++;
          lastError = errData?.message || err.message;
        }

        // Add 300ms throttle between sends to prevent Meta rate limits
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

    await sendWithThrottle();
    
    console.log(`[WhatsApp] Campaign finished. Success: ${successCount}, Failed: ${failCount}`);

    if (successCount > 0) {
      await createNotification(
        req.user._id,
        'success',
        'WhatsApp Campaign Blast Sent',
        `Successfully sent "${cleanSubject}" to ${successCount} phone numbers. ${failCount > 0 ? `(${failCount} failed)` : ''}`
      );
      return res.status(200).json({
        success: true,
        message: `WhatsApp campaign blast sent successfully to ${successCount} recipients`,
        successCount,
        failCount
      });
    } else {
      await createNotification(
        req.user._id,
        'alert',
        'WhatsApp Campaign Failed',
        `Campaign failed to send. Error: ${lastError}`
      );
      return res.status(400).json({
        success: false,
        message: `WhatsApp campaign failed to send. Meta Error: ${lastError}`,
        failCount,
        lastError
      });
    }
  } catch (error) {
    console.error('Error sending WhatsApp campaign:', error);
    res.status(500).json({ message: 'Server error sending WhatsApp campaign' });
  }
});
// ── POST /api/campaigns/request-template ─────────────────────────────────────
// Saves a custom WhatsApp template request to the database
router.post('/request-template', protect, async (req, res) => {
  try {
    const {
      templateName,
      category,
      language,
      headerType,
      headerContent,
      bodyContent,
      footerContent,
      buttons,
      status
    } = req.body;

    const brand = await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ message: 'Brand profile not found.' });
    }

    const newRequest = new RequestedTemplate({
      brandId: brand._id,
      userId: req.user._id,
      templateName,
      category,
      language,
      headerType,
      headerContent,
      bodyContent,
      footerContent,
      buttons,
      status: status || 'PENDING'
    });

    await newRequest.save();

    res.status(201).json({
      message: 'Template request submitted successfully.',
      data: newRequest
    });
  } catch (error) {
    console.error('Error submitting template request:', error);
    res.status(500).json({ message: 'Failed to submit template request.' });
  }
});
// ── PUT /api/campaigns/request-template/:id ─────────────────────────────────
// Updates an existing custom WhatsApp template request (e.g. updating a draft)
router.put('/request-template/:id', protect, async (req, res) => {
  try {
    const {
      templateName,
      category,
      language,
      headerType,
      headerContent,
      bodyContent,
      footerContent,
      buttons,
      status
    } = req.body;

    const brand = await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ message: 'Brand profile not found.' });
    }

    const template = await RequestedTemplate.findOne({ _id: req.params.id, brandId: brand._id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    template.templateName = templateName || template.templateName;
    template.category = category || template.category;
    template.language = language || template.language;
    template.headerType = headerType || template.headerType;
    template.headerContent = headerContent !== undefined ? headerContent : template.headerContent;
    template.bodyContent = bodyContent || template.bodyContent;
    template.footerContent = footerContent !== undefined ? footerContent : template.footerContent;
    template.buttons = buttons || template.buttons;
    if (status) template.status = status;

    await template.save();

    res.status(200).json({
      message: 'Template updated successfully.',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Failed to update template.' });
  }
});

// ── DELETE /api/campaigns/request-template/:id ──────────────────────────────
// Deletes a custom WhatsApp template (only drafts or pending, not approved)
router.delete('/request-template/:id', protect, async (req, res) => {
  try {
    const brand = await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ message: 'Brand profile not found.' });
    }

    const template = await RequestedTemplate.findOne({ _id: req.params.id, brandId: brand._id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    if (template.status === 'APPROVED') {
      return res.status(403).json({ message: 'Approved templates cannot be deleted.' });
    }

    await RequestedTemplate.deleteOne({ _id: req.params.id });

    res.status(200).json({ message: 'Template deleted successfully.' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Failed to delete template.' });
  }
});

// ── GET /api/campaigns/requested-templates ──────────────────────────────────
// Fetches all requested custom WhatsApp templates for a brand
router.get('/requested-templates', protect, async (req, res) => {
  try {
    const brand = await BrandProfile.findOne({ user: req.user._id });
    if (!brand) {
      return res.status(404).json({ message: 'Brand profile not found.' });
    }

    const templates = await RequestedTemplate.find({ brandId: brand._id }).sort({ createdAt: -1 });

    res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching requested templates:', error);
    res.status(500).json({ message: 'Failed to fetch requested templates.' });
  }
});

export default router;
