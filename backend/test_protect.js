import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './models/User.js';

async function testProtect() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syncsocio');
  
  try {
    const user = await User.findOne({});
    console.log('User found:', user.email);
    console.log('ActiveBrandId:', user.activeBrandId);
    
    if (!user.activeBrandId) {
      const BrandProfile = (await import('./models/BrandProfile.js')).default;
      const defaultBrand = await BrandProfile.findOne({ user: user._id });
      if (defaultBrand) {
        user.activeBrandId = defaultBrand._id;
        console.log('Attempting to save user with default brand:', defaultBrand._id);
        await user.save();
        console.log('User saved successfully');
      } else {
        console.log('No default brand found');
      }
    }
  } catch (err) {
    console.error('Error during protect logic:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testProtect();
