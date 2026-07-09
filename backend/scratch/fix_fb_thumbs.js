import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import PostAnalysis from '../models/PostAnalysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { dbName: 'test' });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  
  const posts = await PostAnalysis.find({
    status: { $in: ['published', 'scheduled'] },
    'platforms.facebook': true,
    permanentUrl: { $exists: false }
  });

  console.log(`Found ${posts.length} Facebook posts missing permanentUrl`);

  let count = 0;
  for (const post of posts) {
    const url = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.mediaUrl;
    if (url) {
      post.permanentUrl = url;
      await post.save();
      count++;
    }
  }

  console.log(`Updated ${count} posts.`);
  process.exit();
};

run();
