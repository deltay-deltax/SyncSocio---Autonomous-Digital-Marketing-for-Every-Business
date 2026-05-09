import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import BrandProfile from './models/BrandProfile.js';

dotenv.config();

const FB_API_VERSION = 'v19.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

async function runTest() {
  console.log('--- 🧪 STARTING META API CONNECTIVITY TEST ---');
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const profile = await BrandProfile.findOne({ instagramUsername: 'wefix_25' }).lean();
    if (!profile) {
      console.log('❌ Could not find profile for wefix_25 in database');
      process.exit(1);
    }

    const igId = profile.instagramBusinessAccountId;
    const pageId = profile.instagramPageId;
    const userToken = profile.instagramAccessToken;
    const pageToken = profile.instagramPageAccessToken;

    console.log(`📌 IG ID: ${igId}`);
    console.log(`📌 Page ID: ${pageId}`);

    // Test 1: Basic Profile Info
    console.log('\n1. Testing Basic Profile Info...');
    try {
      const res = await axios.get(`${FB_API_BASE}/${igId}`, {
        params: { fields: 'username,name,id', access_token: userToken }
      });
      console.log(`✅ Success! Username: ${res.data.username}, Name: ${res.data.name}`);
    } catch (e) {
      console.error(`❌ Profile fetch failed: ${e.response?.data?.error?.message || e.message}`);
    }

    // Test 2: Conversation List (The DM Gateway)
    console.log('\n2. Testing Conversation List (DM Gateway)...');
    try {
      const res = await axios.get(`${FB_API_BASE}/${igId}/conversations`, {
        params: { fields: 'id,updated_time', limit: 1, access_token: userToken }
      });
      console.log(`✅ Success! Found ${res.data.data?.length || 0} active threads.`);
    } catch (e) {
      console.error(`❌ Conversations failed: ${e.response?.data?.error?.message || e.message}`);
      console.log('   (Note: If this is 0 or fails with #3, try sending a DM TO the account first)');
    }

    // Test 3: Webhook Subscription Status
    console.log('\n3. Testing Page Webhook Status...');
    try {
      const res = await axios.get(`${FB_API_BASE}/${pageId}/subscribed_apps`, {
        params: { access_token: pageToken }
      });
      console.log('✅ Webhook Subscriptions:', JSON.stringify(res.data.data));
    } catch (e) {
      console.error(`❌ Webhook check failed: ${e.response?.data?.error?.message || e.message}`);
    }

    console.log('\n--- 🏁 TEST COMPLETE ---');
    process.exit(0);

  } catch (err) {
    console.error('Fatal Error:', err.message);
    process.exit(1);
  }
}

runTest();
