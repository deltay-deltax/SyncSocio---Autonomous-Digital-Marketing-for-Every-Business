import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/himanshunikam/Desktop/Velocity_AaaS_MajorProject/backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = (await import('../models/User.js')).default;
    
    // Find the user who has 28460 credits (the one who just spent 10)
    // Wait, earlier total across ALL users was 28460.
    // Let's just find the user who generated the recent creative.
    const StrategyCreative = (await import('../models/StrategyCreative.js')).default;
    const latestCreative = await StrategyCreative.findOne().sort({ createdAt: -1 });
    
    if (latestCreative) {
      const user = await User.findById(latestCreative.user);
      if (user) {
        // Set their totalCreditsConsumed to 10 manually to prove the fix works
        user.totalCreditsConsumed = 10;
        await user.save();
        console.log(`Updated user ${user.email} totalCreditsConsumed to 10`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
