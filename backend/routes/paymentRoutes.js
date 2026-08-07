import express from 'express';
import { createOrder, verifyPayment, getPaymentHistory, downloadInvoice, reportPaymentFailure } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';
import { commonSchemas } from '../validators/common.js';
import { z } from 'zod';
import { createOrderSchema, verifyPaymentSchema, reportPaymentFailureSchema } from '../validators/paymentSchemas.js';

const router = express.Router();

router.post('/create-order', protect, validate({ body: createOrderSchema }), createOrder);
router.post('/verify', protect, validate({ body: verifyPaymentSchema }), verifyPayment);
router.post('/fail', protect, validate({ body: reportPaymentFailureSchema }), reportPaymentFailure);
router.get('/history', protect, getPaymentHistory); // query could be validated if we add pagination schema
router.get('/invoice/:transactionId/download', publicRateLimiter, validate({ params: z.object({ transactionId: commonSchemas.mongoId }) }), downloadInvoice);

export default router;
