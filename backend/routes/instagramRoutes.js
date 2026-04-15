import express from 'express';
import { getInstagramAuthUrl, instagramCallback } from '../controllers/instagramController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get the OAuth URL - Protected to sign the state with user ID
router.get('/auth', protect, getInstagramAuthUrl);

// Callback from Facebook - Public because Meta redirects here
router.get('/callback', instagramCallback);

export default router;
