/**
 * Quick diagnostic script to test Meta API connectivity
 * Run: node test_meta_api.js
 */
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const FB_API_VERSION = 'v19.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

// We need to read the access token from the database, but let's first test basic API connectivity
async function runDiagnostics() {
  console.log('=== META API DIAGNOSTICS ===\n');

  // 1. Test basic Graph API connectivity
  console.log('1️⃣  Testing Graph API connectivity...');
  try {
    const res = await fetch(`${FB_API_BASE}/`);
    const data = await res.json();
    console.log('   ✅ Graph API reachable. Response:', JSON.stringify(data).slice(0, 100));
  } catch (err) {
    console.log('   ❌ Graph API UNREACHABLE:', err.message);
  }

  // 2. Check environment variables
  console.log('\n2️⃣  Checking Environment Variables...');
  const vars = [
    'INSTAGRAM_CLIENT_ID',
    'INSTAGRAM_CLIENT_SECRET',
    'INSTAGRAM_REDIRECT_URI',
    'FRONTEND_URL',
  ];
  for (const v of vars) {
    const val = process.env[v];
    if (val) {
      // Mask secrets
      const display = v.includes('SECRET') ? val.slice(0, 4) + '****' : val;
      console.log(`   ✅ ${v} = ${display}`);
    } else {
      console.log(`   ❌ ${v} is MISSING`);
    }
  }

  // 3. Test with access token from DB
  console.log('\n3️⃣  Testing with stored access token (from MongoDB)...');
  try {
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGO_URI);
    console.log('   ✅ Connected to MongoDB');

    const BrandProfile = (await import('./models/BrandProfile.js')).default;
    const profile = await BrandProfile.findOne({ instagramIsConnected: true })
      .select('instagramAccessToken instagramBusinessAccountId instagramUsername instagramPageId instagramPageAccessToken')
      .lean();

    if (!profile) {
      console.log('   ❌ No connected Instagram profile found in DB');
      await mongoose.disconnect();
      return;
    }

    console.log(`   ✅ Found profile: @${profile.instagramUsername}`);
    console.log(`   📌 IG Business Account ID: ${profile.instagramBusinessAccountId}`);
    console.log(`   📌 Page ID: ${profile.instagramPageId}`);
    console.log(`   📌 Has User Access Token: ${Boolean(profile.instagramAccessToken)}`);
    console.log(`   📌 Has Page Access Token: ${Boolean(profile.instagramPageAccessToken)}`);

    // 4. Test token validity
    console.log('\n4️⃣  Testing access token validity...');
    const debugRes = await fetch(
      `${FB_API_BASE}/debug_token?input_token=${profile.instagramAccessToken}&access_token=${process.env.INSTAGRAM_CLIENT_ID}|${process.env.INSTAGRAM_CLIENT_SECRET}`
    );
    const debugData = await debugRes.json();
    if (debugData.data) {
      console.log(`   App ID: ${debugData.data.app_id}`);
      console.log(`   Is Valid: ${debugData.data.is_valid}`);
      console.log(`   Expires At: ${debugData.data.expires_at ? new Date(debugData.data.expires_at * 1000).toISOString() : 'Never'}`);
      console.log(`   Scopes: ${debugData.data.scopes?.join(', ')}`);
      if (debugData.data.error) {
        console.log(`   ❌ Token Error: ${debugData.data.error.message}`);
      }
    } else {
      console.log('   ❌ Token debug failed:', JSON.stringify(debugData));
    }

    // 5. Test fetching IG profile
    console.log('\n5️⃣  Testing Instagram Business Account fetch...');
    const igRes = await fetch(
      `${FB_API_BASE}/${profile.instagramBusinessAccountId}?fields=username,name,followers_count,media_count&access_token=${profile.instagramAccessToken}`
    );
    const igData = await igRes.json();
    if (igData.error) {
      console.log(`   ❌ IG fetch failed: ${igData.error.message}`);
    } else {
      console.log(`   ✅ @${igData.username} | Followers: ${igData.followers_count} | Posts: ${igData.media_count}`);
    }

    // 6. Test fetching recent media (for comment polling)
    console.log('\n6️⃣  Testing recent media fetch (comment polling source)...');
    const mediaRes = await fetch(
      `${FB_API_BASE}/${profile.instagramBusinessAccountId}/media?fields=id,caption,timestamp,comments_count&limit=3&access_token=${profile.instagramAccessToken}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) {
      console.log(`   ❌ Media fetch failed: ${mediaData.error.message}`);
    } else {
      console.log(`   ✅ Found ${mediaData.data?.length || 0} recent posts:`);
      mediaData.data?.forEach(m => {
        console.log(`      - ${m.id} | Comments: ${m.comments_count} | ${m.caption?.slice(0, 50) || '(no caption)'}...`);
      });
    }

    // 7. Test Page permissions
    console.log('\n7️⃣  Checking Page-level task permissions...');
    const pagePermsRes = await fetch(
      `${FB_API_BASE}/${profile.instagramPageId}?fields=tasks,name&access_token=${profile.instagramAccessToken}`
    );
    const pagePermsData = await pagePermsRes.json();
    if (pagePermsData.error) {
      console.log(`   ❌ Page perms fetch failed: ${pagePermsData.error.message}`);
    } else {
      console.log(`   ✅ Page: ${pagePermsData.name}`);
      console.log(`   📌 Tasks: ${pagePermsData.tasks?.join(', ')}`);
      if (!pagePermsData.tasks?.includes('MESSAGING')) {
        console.log('   ⚠️  WARNING: MESSAGING task is missing from this token for this Page!');
      }
    }

    // 8. Test DM capability (conversation list)
    console.log('\n8️⃣  Testing DM capability (conversation list)...');
    const convRes = await fetch(
      `${FB_API_BASE}/${profile.instagramBusinessAccountId}/conversations?fields=id,name&limit=3&access_token=${profile.instagramAccessToken}`
    );
    const convData = await convRes.json();
    if (convData.error) {
      console.log(`   ❌ Conversations fetch failed: ${convData.error.message}`);
    } else {
      console.log(`   ✅ Can access conversations. Found ${convData.data?.length || 0} recent threads.`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.log(`   ❌ DB/API Error: ${err.message}`);
  }

  console.log('\n=== DIAGNOSTICS COMPLETE ===');
}

runDiagnostics();
