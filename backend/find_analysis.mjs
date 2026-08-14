import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const user = await db.collection('users').findOne({ email: 'admin@syncsocio.com' });

const analysis = await db.collection('post_analyses').findOne({
  userId: user._id,
  _id: new mongoose.Types.ObjectId('6a72f55457b845dccaff0f3b')
});

console.log('Analysis data:', JSON.stringify(analysis, null, 2));

await mongoose.disconnect();
