import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, businessName, businessCategory, intent, website, _gotcha } = req.body;

    // Honeypot check: If the hidden field is filled, it's a bot.
    if (_gotcha && _gotcha.length > 0) {
      console.log('Bot detected via honeypot. Discarding lead silently.');
      return res.status(201).json({ success: true, message: 'Lead submitted successfully.' }); // Fake success
    }

    if (!name || !email || !phone || !businessName || !businessCategory || !intent) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Email validation: strict format checking
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    
    // Catch common email typos
    const lowerEmail = email.trim().toLowerCase();
    const domainPart = lowerEmail.split('@')[1];
    
    if (domainPart && domainPart.startsWith('gmail.') && domainPart !== 'gmail.com') {
      return res.status(400).json({ success: false, message: 'It looks like there is a typo in your email (e.g. @gmail.com).' });
    }
    if (domainPart && domainPart.startsWith('gamil.')) {
      return res.status(400).json({ success: false, message: 'It looks like there is a typo in your email (did you mean @gmail.com?).' });
    }
    if (domainPart && domainPart.startsWith('yahoo.') && domainPart !== 'yahoo.com' && domainPart !== 'yahoo.in' && domainPart !== 'yahoo.co.uk') {
      return res.status(400).json({ success: false, message: 'It looks like there is a typo in your email (e.g. @yahoo.com).' });
    }

    // Name validation: professional format, no numbers or special symbols (except spaces, hyphens, apostrophes)
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s\'\-]{2,50}$/;
    if (!nameRegex.test(name.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid professional name.' });
    }
    
    const lowerName = name.trim().toLowerCase();
    if (/asdf|qwer|zxcv|asds|test|fake|dummy/.test(lowerName)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid professional name.' });
    }

    // Phone validation: allow optional +, spaces, hyphens, and 7-15 digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return res.status(400).json({ success: false, message: 'Please provide a valid phone number.' });
    }

    const newLead = new Lead({
      name,
      email,
      phone: digitsOnly, // Save digits only, formatting handled by admin panel
      businessName,
      website,
      businessCategory,
      intent
    });

    await newLead.save();

    return res.status(201).json({ success: true, message: 'Lead submitted successfully.' });
  } catch (error) {
    console.error('Error saving lead:', error);
    return res.status(500).json({ success: false, message: 'Server error while saving lead.' });
  }
});

export default router;
