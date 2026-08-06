import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/syncsocio";

const brandSchema = new mongoose.Schema({}, { strict: false });
const BrandProfile = mongoose.model('BrandProfile', brandSchema);

async function check() {
  await mongoose.connect(MONGO_URI);
  
  const result = await BrandProfile.updateOne(
    { _id: new mongoose.Types.ObjectId('6a42cbfdcae7ae5208d6e076') },
    { $set: { "nexa.nexa_enabled": true } }
  );
  
  console.log("Update result:", result);
  process.exit(0);
}
check();
