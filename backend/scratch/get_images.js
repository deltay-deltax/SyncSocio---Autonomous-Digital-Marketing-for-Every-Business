import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.MONGO_URI;

mongoose.connect(url).then(async () => {
  const db = mongoose.connection.db;
  const creatives = await db.collection('strategycreatives').find({
    thumbnailBase64: { $regex: 'cloudinary' }
  }).limit(80).toArray();

  const urls = creatives.map(c => c.thumbnailBase64).filter(u => u);
  console.log(JSON.stringify(urls));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
