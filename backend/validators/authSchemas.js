import { z } from 'zod';
import { commonSchemas } from './common.js';

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: commonSchemas.email,
  password: commonSchemas.password,
}).strict();

export const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required').max(500), // Max 500 for login just in case
}).strict();

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required').max(5000),
  plan: z.string().optional(),
  isSignup: z.boolean().optional(),
  metaEventId: z.string().optional(),
}).strict();

export const appleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required').max(5000),
  name: z.string().max(100).optional(),
  plan: z.string().optional(),
  isSignup: z.boolean().optional(),
  metaEventId: z.string().optional(),
}).strict();

export const verifyOtpSchema = z.object({
  email: commonSchemas.email,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  metaEventId: z.string().optional(),
}).strict();

export const resendOtpSchema = z.object({
  email: commonSchemas.email,
}).strict();

export const forgotPasswordSchema = z.object({
  email: commonSchemas.email,
}).strict();

export const resetPasswordParamsSchema = z.object({
  resetToken: z.string().length(40, 'Invalid reset token format'), // crypto.randomBytes(20).toString('hex') is 40 chars
});

export const resetPasswordBodySchema = z.object({
  password: commonSchemas.password,
}).strict();

export const setPasswordSchema = z.object({
  password: commonSchemas.password,
  confirmPassword: commonSchemas.password,
}).strict().refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
