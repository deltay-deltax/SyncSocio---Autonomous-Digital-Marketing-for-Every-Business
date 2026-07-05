/**
 * Migration: Add email_domain_verified field to all BrandProfile documents.
 * Idempotent - safe to run multiple times.
 * Usage: node backend/scripts/migrate_email_domain.js
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  if (!process.env.MONGO_URI) {
    console.error('[Migration] MONGO_URI not found in environment. Aborting.');
    process.exit(1);
  }

  console.log('[Migration] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Migration] Connected.');

  const collection = mongoose.connection.collection('brandprofiles');

  const result = await collection.updateMany(
    { email_domain_verified: { $exists: false } },
    {
      $set: {
        email_from: '',
        email_domain: '',
        sendgrid_domain_id: null,
        email_domain_verified: false,
        email_verified_at: null,
        email_setup_started_at: null,
        email_setup_step: 1,
        dns_records: {
          mail_cname: { host: '', data: '', valid: false },
          dkim1:      { host: '', data: '', valid: false },
          dkim2:      { host: '', data: '', valid: false }
        }
      }
    }
  );

  console.log('[Migration] Documents matched:  ' + result.matchedCount);
  console.log('[Migration] Documents updated:  ' + result.modifiedCount);

  if (result.modifiedCount === 0) {
    console.log('[Migration] All documents already have the email_domain_verified field.');
  } else {
    console.log('[Migration] Successfully added email domain fields to existing brands.');
  }

  await mongoose.disconnect();
  console.log('[Migration] Done.');
}

migrate().catch((err) => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
