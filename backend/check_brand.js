import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = "mongodb://aaditya303gupta_db_user:9BYuNNvzSla0gSRo@ac-hagoozx-shard-00-00.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-01.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-02.lzjkbau.mongodb.net:27017/?ssl=true&replicaSet=atlas-5j7gs0-shard-0&authSource=admin&retryWrites=true&w=majority";

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
