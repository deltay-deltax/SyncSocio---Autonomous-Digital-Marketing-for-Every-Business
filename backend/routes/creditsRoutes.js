import express from 'express';
import { getCredits, assignCredits, deductCredits } from '../controllers/creditsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCredits);
router.post('/assign', protect, assignCredits);
router.post('/deduct', protect, deductCredits);

export default router;
