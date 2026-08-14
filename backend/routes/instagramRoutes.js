import express from 'express';
import {
	getInstagramAuthUrl,
	instagramCallback,
	resubscribeInstagramWebhooks,
	getAutomations,
	updateAutomation,
	disconnectInstagram,
} from '../controllers/instagramController.js';
import { receiveInstagramWebhook, testWebhook, verifyInstagramWebhook } from '../controllers/instagramWebhookController.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';
import { updateAutomationParamsSchema, updateAutomationBodySchema } from '../validators/instagramSchemas.js';

const router = express.Router();

// Get the OAuth URL - Protected to sign the state with user ID
router.get('/auth', protect, getInstagramAuthUrl);

// Callback from Facebook - Public because Meta redirects here
router.get('/callback', publicRateLimiter, instagramCallback);

// Disconnect Instagram Account
router.delete('/disconnect', protect, disconnectInstagram);
router.post('/disconnect', protect, disconnectInstagram);

// Re-subscribe webhook targets for already connected IG accounts
router.post('/resubscribe-webhooks', protect, resubscribeInstagramWebhooks);

// Global Automation Settings
router.get('/automations', protect, getAutomations);
router.patch('/automations/:type', protect, validate({ params: updateAutomationParamsSchema, body: updateAutomationBodySchema }), updateAutomation);

// Webhook verification and events from Meta
router.get('/webhook', verifyInstagramWebhook);
router.post('/webhook', receiveInstagramWebhook);

// Test endpoint: verify pipeline independently of Meta
router.post('/webhook/test', testWebhook);

export default router;
