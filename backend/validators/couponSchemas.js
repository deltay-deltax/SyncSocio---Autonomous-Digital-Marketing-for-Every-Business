import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  planName: z.string().optional(),
  purchaseType: z.string().optional(),
  plan: z.string().optional(),
}).strict();
