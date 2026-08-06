import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  plan: z.string().optional(),
}).strict();
