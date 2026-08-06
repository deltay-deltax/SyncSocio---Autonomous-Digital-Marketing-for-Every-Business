import { z } from 'zod';

// MongoDB ObjectId Regex (24 hex characters)
const objectIdRegex = /^[a-f\d]{24}$/i;

export const commonSchemas = {
  mongoId: z.string().regex(objectIdRegex, 'Invalid MongoDB ID format'),
  email: z.string().email('Invalid email address format').max(254),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  shortString: z.string().max(500).trim(),
  longString: z.string().max(5000).trim(),
  url: z.string().url('Invalid URL format'),
  positiveInt: z.coerce.number().int().positive(),
  nonNegativeInt: z.coerce.number().int().nonnegative(),
  booleanStrict: z.boolean({
    required_error: "Boolean is required",
    invalid_type_error: "Value must be a boolean",
  }),
};

// Common object structures
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const idParamSchema = z.object({
  id: commonSchemas.mongoId,
});
