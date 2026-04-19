import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const profile = await mongoose.connection.db.collection('brandprofiles').findOne({ instagramIsConnected: true });
const flows = await mongoose.connection.db.collection('dm_flows').find({ active: true }).toArray();

console.log('\n=== CONNECTED INSTAGRAM PROFILE ===');
if (profile) {
  console.log('Username:', profile.instagramUsername);
  console.log('IG Business ID:', profile.instagramBusinessAccountId);
  console.log('Page ID:', profile.instagramPageId);
  console.log('Has User Token:', Boolean(profile.instagramAccessToken));
  console.log('Has Page Token:', Boolean(profile.instagramPageAccessToken));
  console.log('User ObjectId:', profile.user);
} else {
  console.log('❌ No connected Instagram profile found!');
}

console.log('\n=== ACTIVE DM FLOWS ===');
if (flows.length === 0) {
  console.log('❌ No active DM flows found! Create one in the DM Automations dashboard first.');
} else {
  flows.forEach((f, i) => {
    console.log(`\nFlow ${i + 1}:`);
    console.log('  Name:', f.name);
    console.log('  Keyword:', f.keyword);
    console.log('  Keyword Normalized:', f.keywordNormalized);
    console.log('  Trigger:', f.trigger);
    console.log('  Target:', f.targetType);
    console.log('  Active:', f.active);
    console.log('  User:', f.user?.toString());
    console.log('  Messages:', f.messages?.length || 0);
    if (f.messages?.[0]) {
      console.log('  First msg text:', f.messages[0].text?.slice(0, 80));
    }
  });
}

// Check if flow users match profile user
if (profile && flows.length > 0) {
  const profileUserId = profile.user?.toString();
  const mismatch = flows.filter(f => f.user?.toString() !== profileUserId);
  if (mismatch.length > 0) {
    console.log('\n⚠️  WARNING: Some flows belong to a different user than the connected profile!');
    mismatch.forEach(f => console.log(`  Flow "${f.name}" user=${f.user} vs profile user=${profileUserId}`));
  } else {
    console.log('\n✅ All flows belong to the connected IG profile user.');
  }
}

await mongoose.disconnect();
