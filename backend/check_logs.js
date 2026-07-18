import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/velocity')
  .then(async () => {
    const db = mongoose.connection.db;
    const logs = await db.collection('apilogs').find().sort({createdAt: -1}).limit(5).toArray();
    console.log("Latest logs:");
    logs.forEach(l => console.log(l.createdAt));
    process.exit(0);
  });
