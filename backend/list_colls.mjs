import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const collections = await db.listCollections().toArray();
console.log('Collections:', collections.map(c => c.name).join(', '));

const PostAnalysis = (await import('./models/PostAnalysis.js')).default;
console.log('PostAnalysis collection name:', PostAnalysis.collection.name);

await mongoose.disconnect();
