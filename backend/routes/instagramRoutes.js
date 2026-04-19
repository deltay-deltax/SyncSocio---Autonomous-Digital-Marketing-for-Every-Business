import express from 'express';
import {
	getInstagramAuthUrl,
	instagramCallback,
	resubscribeInstagramWebhooks,
} from '../controllers/instagramController.js';
import { receiveInstagramWebhook, testWebhook, verifyInstagramWebhook } from '../controllers/instagramWebhookController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get the OAuth URL - Protected to sign the state with user ID
router.get('/auth', protect, getInstagramAuthUrl);

// Callback from Facebook - Public because Meta redirects here
router.get('/callback', instagramCallback);

// Re-subscribe webhook targets for already connected IG accounts
router.post('/resubscribe-webhooks', protect, resubscribeInstagramWebhooks);

// Webhook verification and events from Meta
router.get('/webhook', verifyInstagramWebhook);
router.post('/webhook', receiveInstagramWebhook);

// Test endpoint: verify pipeline independently of Meta
router.post('/webhook/test', testWebhook);

export default router;
