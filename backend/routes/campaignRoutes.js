import express from 'express';
import nodemailer from 'nodemailer';
import { protect } from '../middleware/authMiddleware.js';
import EmailList from '../models/EmailList.js';
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
      `Saved recipient list "${emailList.name}" with ${emailList.emails.length} contacts.`
    );

    res.status(201).json(emailList);
  } catch (error) {
    console.error('Error saving email list:', error);
    res.status(500).json({ message: 'Server error saving email list' });
  }
});

// Send email campaign
router.post('/send', protect, async (req, res) => {
  const { recipients, subject, body, image } = req.body;
  try {
    if (!recipients || !recipients.length || !subject || !body) {
      return res.status(400).json({ message: 'Recipients, subject, and body are required' });
    }

    const profile = await BrandProfile.findOne({ user: req.user._id });
    const brandName = profile?.brandName || 'VelocityDM';
    const senderEmail = profile?.gmailEmail || process.env.SMTP_USER || 'noreply@velocitydm.com';

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
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
              ${hasImage ? '<img src="cid:campaign-hero" style="width: 100%; border-radius: 12px; margin-bottom: 20px; display: block;" />' : ''}
              <div style="font-size: 14px; line-height: 1.6; color: #1a202c; white-space: pre-wrap;">${body}</div>
              <div style="margin-top: 30px; border-t: 1px solid #edf2f7; padding-top: 15px; font-size: 10px; color: #a0aec0; text-align: center;">
                Sent via ${brandName} | Auto-generated Campaign
              </div>
            </div>
          `,
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

export default router;
