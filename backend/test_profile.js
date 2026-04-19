import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
const doc = await mongoose.connection.db.collection('brandprofiles').findOne({ instagramUsername: 'wefix_25' });
console.log(JSON.stringify(doc, null, 2));
await mongoose.disconnect();
