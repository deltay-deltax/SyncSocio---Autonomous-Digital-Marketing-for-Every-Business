import { z } from 'zod';
import { commonSchemas } from './common.js';

export const createOrderSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  currency: z.string().length(3).optional().default('INR'),
  receipt: z.string().max(100).optional(),
  type: z.enum(['topup', 'plan_purchase', 'plan_renewal', 'plan_upgrade', 'dm_addon_purchase']).optional(),
  plan: z.string().max(100).optional(),
  creditsAdded: commonSchemas.nonNegativeInt.optional(),
  couponCode: z.string().max(50).optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
}).strict();

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required').max(100),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required').max(100),
  razorpay_signature: z.string().min(1, 'Signature is required').max(200),
  billingAddress: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
    gstNumber: z.string().optional(),
  }).optional(),
  metaEventId: z.string().optional(),
}).strict();

export const reportPaymentFailureSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Order ID is required').max(100),
  razorpayPaymentId: z.string().max(100).optional(),
  reason: z.string().max(1000).optional(),
  billingAddress: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
    gstNumber: z.string().optional(),
  }).optional(),
}).strict();
