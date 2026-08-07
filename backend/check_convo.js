import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import NexaConversation from './models/NexaConversation.js';
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const convo = await NexaConversation.findById('6a761e7ec3d56a0844b562fe');
  console.log('Platform:', convo?.platform, 'ig_user_id:', convo?.ig_user_id);
  mongoose.disconnect();
});
