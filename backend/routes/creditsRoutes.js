import express from 'express';
import { getCredits, assignCredits, deductCredits, topupCredits, getLedger } from '../controllers/creditsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { deductionSchema } from '../validators/creditSchemas.js';

const router = express.Router();

router.get('/', protect, getCredits);
router.get('/ledger', protect, getLedger);
router.post('/assign', protect, assignCredits); // Should be admin only, but keep as is for now
router.post('/deduct', protect, validate({ body: deductionSchema }), deductCredits);
router.post('/topup', protect, topupCredits); // payment-related, maybe similar to assign?

export default router;
