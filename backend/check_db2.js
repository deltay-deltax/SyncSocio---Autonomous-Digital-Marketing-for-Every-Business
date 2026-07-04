import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const User = (await import('./models/User.js')).default;
  const StrategyCreative = (await import('./models/StrategyCreative.js')).default;
  
  const user = await User.findOne({ email: 'guptaaaditya418031@gmail.com' });
  
  const creatives_all = await StrategyCreative.find({ user: user._id }).sort({createdAt: -1}).limit(2);
  console.log("Recent creatives:", creatives_all);
  
  process.exit(0);
};

run().catch(console.error);
