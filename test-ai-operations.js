import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Velocity_AaaS');
    console.log('Connected to MongoDB');
    
    const AgentActivity = (await import('./backend/models/AgentActivity.js')).default;
    const PostAnalysis = (await import('./backend/models/PostAnalysis.js')).default;
    const ContentCalendar = (await import('./backend/models/ContentCalendar.js')).default;
    
    const count = await AgentActivity.countDocuments();
    console.log('AgentActivity count:', count);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
test();
