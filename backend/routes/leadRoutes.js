import express from 'express';
import Lead from '../models/Lead.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, businessName, website, businessCategory, intent } = req.body;

    if (!name || !email || !phone || !businessName || !website || !businessCategory || !intent) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newLead = new Lead({
      name,
      email,
      phone,
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
