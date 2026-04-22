import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BrandProfile from './models/BrandProfile.js';

dotenv.config();

async function reset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
    const res = await BrandProfile.updateOne(
      { brandName: /wefix/i }, 
      { $set: { generationCount: 0, lastPlanGeneratedAt: null } }
    );
    console.log("Reset result:", res);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

reset();
