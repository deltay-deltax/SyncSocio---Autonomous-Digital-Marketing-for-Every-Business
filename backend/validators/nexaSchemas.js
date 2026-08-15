import { z } from 'zod';
import { commonSchemas } from './common.js';

export const updateNexaSettingsSchema = z.object({
  nexa_enabled: commonSchemas.booleanStrict.optional(),
  razorpay_key_id: z.string().optional(),
  razorpay_key_secret: z.string().optional(),
  cod_enabled: commonSchemas.booleanStrict.optional(),
  upi_id: z.string().optional(),
  bank_details: z.string().max(1000).optional(),
  min_discount: z.coerce.number().min(0).max(100).optional(),
  max_discount: z.coerce.number().min(0).max(100).optional(),
  upi_qr_code_url: z.string().optional(),
  business_context: z.string().max(5000).optional(),
  demo_booking_link: z.string().max(1000).optional(),
}).strict();

export const listNexaConversationsSchema = z.object({
  page: commonSchemas.positiveInt.optional(),
  limit: commonSchemas.positiveInt.optional(),
  stage: z.string().optional(),
});
