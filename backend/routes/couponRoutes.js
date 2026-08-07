import express from 'express';
import { validateCoupon } from '../controllers/couponController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { validateCouponSchema } from '../validators/couponSchemas.js';

const router = express.Router();

router.post('/validate', protect, validate({ body: validateCouponSchema }), validateCoupon);

export default router;
