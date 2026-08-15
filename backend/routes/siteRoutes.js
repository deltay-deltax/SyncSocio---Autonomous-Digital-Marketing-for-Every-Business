import express from 'express';
import SiteSettings from '../models/SiteSettings.js';
import { handleChat, handleDashboardChat } from '../controllers/siteChatController.js';

const router = express.Router();

router.get('/settings', async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = { domeGalleryImages: [] };
    }
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Landing page Nexa (general visitor chatbot)
router.post('/chatbot', handleChat);

// In-dashboard Nexa (support agent with full KB)
router.post('/dashboard-chatbot', handleDashboardChat);

export default router;
