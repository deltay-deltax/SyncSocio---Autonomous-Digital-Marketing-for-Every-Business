import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import BrandProfile from './models/BrandProfile.js';
import NexaConversation from './models/NexaConversation.js';

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syncsocio');
  
  try {
    const brands = await BrandProfile.find({}).select('_id').lean();
    console.log('Brands found:', brands.length);

    const brandIds = brands.map(b => b._id);
    const page  = 1;
    const limit = 50;
    
    const query = { brand_id: { $in: brandIds } };

    const [conversations, total] = await Promise.all([
      NexaConversation.find(query)
        .select('ig_user_id platform stage origin collected payment escalate_to_human nudge_sent conversation_history createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NexaConversation.countDocuments(query),
    ]);

    console.log('Total Conversations:', total);
    console.log('Conversations Fetched:', conversations.length);

  } catch (err) {
    console.error('Error fetching conversations:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
