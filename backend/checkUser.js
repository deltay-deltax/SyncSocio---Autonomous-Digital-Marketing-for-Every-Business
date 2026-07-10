import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import BrandProfile from './models/BrandProfile.js';

dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/syncsocio');
    const user = await User.findOne({ email: 'hixeriv670@dysonc.com' });
    if (!user) {
      console.log('User not found!');
      process.exit(0);
    }
    console.log('User:', user);
    
    const profile = await BrandProfile.findOne({ user: user._id });
    console.log('BrandProfile:', profile);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

check();
