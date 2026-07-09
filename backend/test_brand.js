import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const brand = await mongoose.connection.db.collection('brandprofiles').findOne({});
  console.log(brand);
  
  if (brand) {
     await mongoose.connection.db.collection('brandprofiles').updateOne({_id: brand._id}, {$set: {otherCategory: "Dental Clinic"}});
     console.log("Updated to Dental Clinic");
  }
  process.exit(0);
});
