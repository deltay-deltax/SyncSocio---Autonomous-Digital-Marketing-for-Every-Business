import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/himanshunikam/Desktop/Velocity_AaaS_MajorProject/backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const ApiLog = (await import('../models/ApiLog.js')).default;
    const logs = await ApiLog.find().sort({ createdAt: -1 }).limit(3);
    for (const log of logs) {
      console.log('ID:', log._id);
      console.log('Raw createdAt:', log.createdAt);
      console.log('ISO:', log.createdAt.toISOString());
      console.log('en-IN:', new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute:'2-digit' }));
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
run();
