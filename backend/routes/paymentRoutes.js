import express from 'express';
import { createOrder, verifyPayment, getPaymentHistory, downloadInvoice } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);
router.get('/invoice/:transactionId/download', downloadInvoice);

export default router;
