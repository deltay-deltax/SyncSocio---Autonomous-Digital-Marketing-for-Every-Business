import mongoose from 'mongoose';
import BrandProfile from './models/BrandProfile.js';
import dotenv from 'dotenv';
dotenv.config();

const cleanDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Keep ONLY the active brand profile, delete ALL others
    const activeBrandId = '6a4b7748ec8c842b6373953b';
    const res = await BrandProfile.deleteMany({ _id: { $ne: activeBrandId } });
    
    console.log('Deleted duplicate BrandProfiles:', res.deletedCount);
    console.log('Cleanup complete!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

cleanDb();
