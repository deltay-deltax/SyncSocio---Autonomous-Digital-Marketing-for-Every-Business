import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models so they are registered
import './models/BrandProfile.js';
import './models/DMFlow.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const BrandProfile = mongoose.model('BrandProfile');
  const DMFlow = mongoose.model('DMFlow');
  
  const profile = await BrandProfile.findOne({ instagramUsername: 'wefix_25' });
  if (!profile) {
    console.log('Profile not found!');
  } else {
    console.log('Profile user ID:', profile.user.toString());
  }
  
  const flows = await DMFlow.find({});
  console.log(`\nFound ${flows.length} flow(s) in DB:`);
  
  for (const f of flows) {
    const match = profile && (f.user.toString() === profile.user.toString()) ? '✅ MATCHES' : '❌ WRONG USER';
    console.log('--------------------------------------------------');
    console.log(`[${match}] Flow: "${f.name}" | Keyword: "${f.keyword}" | flow.user: ${f.user.toString()}`);
    console.log('Messages:');
    f.messages.forEach((msg, idx) => {
      console.log(`  Msg ${idx + 1} text: "${msg.text}"`);
      console.log(`  Msg ${idx + 1} buttons:`, JSON.stringify(msg.buttons));
    });
  }
  
  await mongoose.disconnect();
};

run().catch(console.error);
