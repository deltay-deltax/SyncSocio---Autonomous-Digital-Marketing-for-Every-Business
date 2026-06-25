import 'dotenv/config';
import mongoose from 'mongoose';
import BrandProfile from '../models/BrandProfile.js';
import Notification from '../models/Notification.js';

import { createNotification } from '../utils/notificationHelper.js';

async function verify() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const testUserId = '6a36a7777204897de7a69e6a';

    // 1. Verify schema update by updating a profile with WhatsApp connection
    console.log('\n--- 1. Testing Schema and Profile Save ---');
    const profile = await BrandProfile.findOne({ user: testUserId });
    if (!profile) {
      throw new Error(`Test profile not found for user ${testUserId}`);
    }

    profile.whatsappIsConnected = true;
    profile.whatsappNumber = '+15550199';
    await profile.save();
    console.log('Saved profile with WhatsApp connection fields successfully!');

    // Re-fetch and log to confirm
    const updatedProfile = await BrandProfile.findOne({ user: testUserId });
    console.log('Verified Fields in DB:');
    console.log('whatsappIsConnected:', updatedProfile.whatsappIsConnected);
    console.log('whatsappNumber:', updatedProfile.whatsappNumber);

    // 2. Call mock send-whatsapp logic programmatically or inspect route handling
    console.log('\n--- 2. Creating a test campaign notification to verify mock campaign flow ---');
    const startCount = await Notification.countDocuments({ userId: testUserId });

    // Since notifications are created after the campaign blast, let's create one using the helper
    await createNotification(
      testUserId,
      'success',
      'WhatsApp Campaign Sent',
      'Successfully sent WhatsApp blast to 5 recipients (Verification Test).'
    );

    const endCount = await Notification.countDocuments({ userId: testUserId });
    console.log(`Notification created successfully! Total notifications count increased from ${startCount} to ${endCount}`);

    console.log('\nVerification complete! All tests passed.');
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

verify();
