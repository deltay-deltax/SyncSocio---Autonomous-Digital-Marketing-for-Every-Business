import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const clear = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("MONGO_URI not found in environment variables");
      process.exit(1);
    }
    console.log(`Connecting to: ${uri}`);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const collections = [
      'users',
      'brandprofiles',
      'content_calendars',
      'post_analyses',
      'dm_flows',
      'dm_flow_followups',
      'dm_conversations',
      'instagram_comment_reply_logs',
      'agent_activities',
      'notifications',
      'assets'
    ];

    for (const name of collections) {
      const collection = mongoose.connection.collection(name);
      try {
        const count = await collection.countDocuments();
        if (count > 0) {
          const res = await collection.deleteMany({});
          console.log(`Deleted ${res.deletedCount} documents from collection '${name}'`);
        } else {
          console.log(`Collection '${name}' is already empty.`);
        }
      } catch (err) {
        console.warn(`Could not clear collection '${name}':`, err.message);
      }
    }

    console.log('Database clean and clear completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Clear failed:', error);
    process.exit(1);
  }
};

clear();
