import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './models/BrandProfile.js';
import './models/DMFlow.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const BrandProfile = mongoose.model('BrandProfile');
  const DMFlow = mongoose.model('DMFlow');
  
  const profile = await BrandProfile.findOne({ instagramUsername: 'wefix_25' });
  if (!profile) return;
  
  const userId = profile.user.toString();
  
  // 1. Reassign all flows to the correct user ID
  await DMFlow.updateMany(
    { user: { $ne: profile.user } },
    { $set: { user: profile.user } }
  );
  console.log('Reassigned all disjointed flows to your main account!');
  
  // 2. Add the URL button to 'Test Flow' if it's missing
  const testFlow = await DMFlow.findOne({ name: 'Test Flow', user: profile.user });
  if (testFlow && testFlow.messages && testFlow.messages.length > 0) {
    if (!testFlow.messages[0].buttons || testFlow.messages[0].buttons.length === 0) {
      testFlow.messages[0].buttons = [{
        id: 'inserted_button_123',
        label: 'Open Link',
        type: 'url',
        url: 'https://github.com/deltay-deltax/Velocity_AaaS_MajorProject'
      }];
      await DMFlow.updateOne({ _id: testFlow._id }, { $set: { messages: testFlow.messages } });
      console.log('Added the missing Open Link button to Test Flow!');
    }
  }

  await mongoose.disconnect();
};

run().catch(console.error);
