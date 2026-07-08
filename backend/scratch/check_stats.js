import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/himanshunikam/Desktop/Velocity_AaaS_MajorProject/backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const User = (await import('../models/User.js')).default;
    const Asset = (await import('../models/Asset.js')).default;

    const StrategyCreative = (await import('../models/StrategyCreative.js')).default;
    const DMFlow = (await import('../models/DMFlow.js')).default;
    const ApiLog = (await import('../models/ApiLog.js')).default;

    const totalAssets = await Asset.countDocuments();
    const totalStrategyCreatives = await StrategyCreative.countDocuments();
    const totalDMFlows = await DMFlow.countDocuments();
    const totalApiLogs = await ApiLog.countDocuments();
    console.log(`Total Assets/Landing Pages: ${totalAssets}`);
    console.log(`Total Strategy Creatives: ${totalStrategyCreatives}`);
    console.log(`Total DM Flows: ${totalDMFlows}`);
    console.log(`Total API Logs: ${totalApiLogs}`);

    const allUsers = await User.find().select('credits totalCreditsPurchased totalCreditsConsumed');
    const totalCredits = allUsers.reduce((acc, u) => acc + (u.credits || 0), 0);
    const totalCreditsConsumed = allUsers.reduce((acc, u) => acc + (u.totalCreditsConsumed || 0), 0);
    const totalCreditsPurchased = allUsers.reduce((acc, u) => acc + (u.totalCreditsPurchased || 0), 0);
    
    console.log(`Total Credits Remaining: ${totalCredits}`);
    console.log(`Total Credits Consumed: ${totalCreditsConsumed}`);
    console.log(`Total Credits Purchased: ${totalCreditsPurchased}`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
