import express from 'express';
import nodemailer from 'nodemailer';
import { protect } from '../middleware/authMiddleware.js';
import EmailList from '../models/EmailList.js';
import PhoneList from '../models/PhoneList.js';
import BrandProfile from '../models/BrandProfile.js';
import { createNotification } from '../utils/notificationHelper.js';

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

// Send email campaign
router.post('/send', protect, async (req, res) => {
  const { recipients, subject, body, image } = req.body;
  try {
    if (!recipients || !recipients.length || !subject || !body) {
      return res.status(400).json({ message: 'Recipients, subject, and body are required' });
    }

    const isHtml = body.includes('<') && (body.includes('</') || body.includes('/>'));
    const cleanBody = isHtml ? body.replace(/[\r\n]+/g, ' ').replace(/>\s+</g, '><').trim() : body;

    const profile = await BrandProfile.findOne({ user: req.user._id });
    const brandName = profile?.brandName || 'SyncSocio';
    const senderEmail = profile?.gmailEmail || process.env.SMTP_USER || 'noreply@syncsocio.com';

    // Verify SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ message: 'SMTP credentials not configured on server' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      family: 4,
    });

    const hasImage = typeof image === 'string' && image.startsWith('data:');

    // Throttled/sequential sending helper to mimic professional campaign blasting
    const sendWithThrottle = async () => {
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        const mailOptions = {
          from: `"${brandName}" <${senderEmail}>`,
          to: recipient,
          subject: subject,
          html: isHtml
            ? cleanBody
            : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
              ${hasImage ? '<img src="cid:campaign-hero" style="width: 100%; border-radius: 12px; margin-bottom: 20px; display: block;" />' : ''}
              <div style="font-size: 14px; line-height: 1.6; color: #1a202c; white-space: pre-wrap;">${cleanBody}</div>
              <div style="margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 15px; font-size: 10px; color: #a0aec0; text-align: center;">
                Sent via ${brandName} | Auto-generated Campaign
              </div>
            </div>
          `.replace(/[\r\n]+/g, ' ').replace(/>\s+</g, '><').trim(),
          attachments: hasImage ? [{
            filename: 'hero.png',
            content: Buffer.from(image.split(',')[1], 'base64'),
            cid: 'campaign-hero'
          }] : []
        };

        try {
          await transporter.sendMail(mailOptions);
        } catch (err) {
          console.error(`Failed sending to ${recipient}:`, err.message);
        }

        // 300ms gap between individual sends to stay within limits
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

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

    const profile = await BrandProfile.findOne({ user: req.user._id });
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
    let messageText = subject ? `*${subject}* 🔸 ${body}` : body;
    
    // Meta API Rule: Template parameters ({{1}}) cannot contain newlines, tabs, or >4 consecutive spaces
    messageText = messageText.replace(/[\r\n]+/g, '  🔸  ').replace(/\s{2,}/g, ' ').trim();

    const sendWithThrottle = async () => {
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i].replace('+', ''); // WhatsApp API expects number without '+'
        
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
        };

        if (mediaId) {
          payload.type = 'template';
          payload.template = {
            name: 'custom_campaign_image',
            language: { code: 'en_US' },
            components: [
              {
                type: 'header',
                parameters: [{ type: 'image', image: { id: mediaId } }]
              },
              {
                type: 'body',
                parameters: [{ type: 'text', text: messageText }]
              }
            ]
          };
        } else {
          payload.type = 'template';
          payload.template = {
            name: 'custom_campaign_text',
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: messageText }]
              }
            ]
          };
        }

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
        } catch (err) {
          console.error(`[WhatsApp] Failed sending to ${recipient}:`, err?.response?.data || err.message);
        }

        // Add slight delay to avoid rate limits
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

    // Trigger async throttled sending sequence
    sendWithThrottle().then(async () => {
      console.log(`WhatsApp Campaign completed sending to ${recipients.length} recipients.`);
      await createNotification(
        req.user._id,
        'success',
        'WhatsApp Campaign Sent',
        `Successfully triggered WhatsApp blast to ${recipients.length} recipients.`
      );
    });

    res.status(200).json({ success: true, message: 'WhatsApp campaign blast triggered successfully' });
  } catch (error) {
    console.error('Error sending WhatsApp campaign:', error);
    res.status(500).json({ message: 'Server error sending WhatsApp campaign' });
  }
});

export default router;
