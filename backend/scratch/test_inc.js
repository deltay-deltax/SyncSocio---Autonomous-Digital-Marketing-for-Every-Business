import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/himanshunikam/Desktop/Velocity_AaaS_MajorProject/backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = (await import('../models/User.js')).default;
    
    // Pick the first user
    const user = await User.findOne();
    if (!user) return console.log("No user found");
    
    console.log("Before:", user.credits, user.totalCreditsConsumed);
    
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { credits: -1, totalCreditsConsumed: 1 } },
      { new: true, select: 'credits plan totalCreditsConsumed' }
    );
    
    console.log("After:", updated.credits, updated.totalCreditsConsumed);
    
    // Clean up
    await User.findByIdAndUpdate(user._id, { $inc: { credits: 1, totalCreditsConsumed: -1 } });
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
