import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import BrandProfile from './models/BrandProfile.js';

dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/syncsocio');
    const user = await User.findOne({ email: 'hixeriv670@dysonc.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:', user._id, 'Active Brand:', user.activeBrandId, 'Plan:', user.plan);

    const profiles = await BrandProfile.find({ user: user._id });
    console.log('Found', profiles.length, 'profiles');
    for (const p of profiles) {
      console.log('Profile ID:', p._id, 'Name:', p.brandName, 'SelectedPlan:', p.selectedPlan);
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

test();
