import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const user = await db.collection('users').findOne({ email: 'admin@syncsocio.com' });

const analyses = await db.collection('post_analyses').find({
  userId: user._id
}).toArray();

console.log('Found', analyses.length, 'analyses in post_analyses');
for (const a of analyses) {
  console.log('- ID:', a._id, '| Status:', a.status, '| Text:', (a.originalText || a.generatedCaption || '').substring(0, 50));
}

await mongoose.disconnect();
