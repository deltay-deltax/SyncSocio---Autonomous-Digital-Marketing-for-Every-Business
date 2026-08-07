import { z } from 'zod';
import { commonSchemas } from './common.js';

export const updateUserCreditsSchema = z.object({
  credits: z.coerce.number().min(0, 'Credits must be non-negative'),
}).strict();

export const updateUserPlanSchema = z.object({
  plan: z.string().min(1, 'Plan is required').max(100),
}).strict();

export const updateUserDeepProfileSchema = z.object({
  name: z.string().max(100).optional(),
  email: commonSchemas.email.optional(),
  plan: z.string().max(100).optional(),
  credits: z.coerce.number().min(0).optional(),
  isVerified: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
}).strict();

export const createCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  discountPercentage: z.coerce.number().min(0).max(100),
  expiryDate: z.string().datetime().optional(), // ISO date string
  maxUses: commonSchemas.positiveInt.optional(),
  applicableOn: z.array(z.string()).optional(),
}).strict();

export const sendManualEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  message: z.string().min(1, 'Message is required').max(10000),
}).strict();

export const deleteUserAccountSchema = z.object({
  reason: z.string().max(1000).optional(),
}).strict();

export const toggleBlockUserSchema = z.object({
  isBlocked: commonSchemas.booleanStrict,
}).strict();

export const reviewDomeSubmissionSchema = z.object({
  approved: commonSchemas.booleanStrict,
}).strict();

export const updatePartnerStatusSchema = z.object({
  status: z.string().optional(),
  comments: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  website: z.string().optional(),
  businessCategory: z.string().optional(),
}).strict();
