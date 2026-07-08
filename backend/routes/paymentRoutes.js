import express from 'express';
import { createOrder, verifyPayment, getPaymentHistory, downloadInvoice, reportPaymentFailure } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/fail', protect, reportPaymentFailure);
router.get('/history', protect, getPaymentHistory);
router.get('/invoice/:transactionId/download', downloadInvoice);

export default router;
