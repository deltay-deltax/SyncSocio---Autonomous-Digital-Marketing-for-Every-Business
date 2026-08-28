import express from 'express';
import { trackClick, getCreatorDashboard, requestPayout, getAllCreators, createCreator, markPayoutPaid } from '../controllers/creatorController.js';
import { verifyAdmin } from '../controllers/adminController.js';

const router = express.Router();

// Public Routes (For frontend tracking and creator dashboard)
router.post('/track-click', trackClick);
router.get('/dashboard/:token', getCreatorDashboard);
router.post('/dashboard/:token/payout', requestPayout);

// Admin Routes (Protected)
router.use(verifyAdmin);
router.get('/', getAllCreators);
router.post('/', createCreator);
router.post('/:id/mark-paid', markPayoutPaid);

export default router;
