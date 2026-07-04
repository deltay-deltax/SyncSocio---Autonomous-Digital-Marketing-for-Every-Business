import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const User = (await import('./models/User.js')).default;
  const StrategyCreative = (await import('./models/StrategyCreative.js')).default;
  
  const user = await User.findOne({ email: 'guptaaaditya418031@gmail.com' });
  
  const scheduled = await StrategyCreative.findOne({ user: user._id, status: 'scheduled' });
  if (scheduled) {
    console.log("Found scheduled creative:", scheduled._id);
  } else {
    console.log("No scheduled creative found. Let's make one.");
    const creative = await StrategyCreative.findOne({ user: user._id });
    if (creative) {
      creative.status = 'scheduled';
      await creative.save();
      console.log("Set creative to scheduled:", creative._id);
    }
  }
  
  process.exit(0);
};

run().catch(console.error);
