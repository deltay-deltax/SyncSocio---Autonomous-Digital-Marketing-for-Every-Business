import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const User = (await import('./models/User.js')).default;
  const StrategyCreative = (await import('./models/StrategyCreative.js')).default;
  
  const user = await User.findOne({ email: 'guptaaaditya418031@gmail.com' });
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }
  console.log('User ID:', user._id);
  
  const creatives = await StrategyCreative.find({ user: user._id });
  console.log('Creatives count:', creatives.length);
  if (creatives.length > 0) {
    console.log('Sample creative:', {
      _id: creatives[0]._id,
      status: creatives[0].status,
      brandId: creatives[0].brandId
    });
  }
  
  process.exit(0);
};

run().catch(console.error);
