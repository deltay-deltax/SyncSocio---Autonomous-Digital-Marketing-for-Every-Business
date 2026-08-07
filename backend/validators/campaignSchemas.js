import { z } from 'zod';
import { commonSchemas } from './common.js';

export const createEmailListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  emails: z.array(commonSchemas.email).min(1, 'At least one email is required').max(10000),
}).strict();

export const createPhoneListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phones: z.array(z.string().min(7).max(20)).min(1, 'At least one phone is required').max(10000),
}).strict();

export const sendEmailCampaignSchema = z.object({
  recipients: z.array(commonSchemas.email).min(1).max(5000),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required').max(50000),
  image: z.string().optional(),
}).strict();

export const sendWhatsappCampaignSchema = z.object({
  recipients: z.array(z.string()).min(1).max(5000),
  body: z.string().min(1, 'Body is required').max(5000),
  image: z.string().optional(),
  subject: z.string().optional(),
  whatsappTemplateName: z.string().optional(),
  whatsappUrlParam: z.string().optional(),
  whatsappVariables: z.record(z.any()).optional(),
}).strict();

export const requestTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  category: z.string().optional(),
  language: z.string().optional(),
  headerType: z.string().optional(),
  headerContent: z.string().optional(),
  bodyContent: z.string().min(1, 'Body content is required'),
  footerContent: z.string().optional(),
  buttons: z.array(z.any()).optional(),
  status: z.string().optional(),
}).strict();

export const updateTemplateSchema = requestTemplateSchema.partial().strict();
