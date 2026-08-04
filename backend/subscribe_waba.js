import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const MONGO_URI = "mongodb://aaditya303gupta_db_user:9BYuNNvzSla0gSRo@ac-hagoozx-shard-00-00.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-01.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-02.lzjkbau.mongodb.net:27017/?ssl=true&replicaSet=atlas-5j7gs0-shard-0&authSource=admin&retryWrites=true&w=majority";

const brandSchema = new mongoose.Schema({}, { strict: false });
const BrandProfile = mongoose.model('BrandProfile', brandSchema);

async function check() {
  await mongoose.connect(MONGO_URI);
  
  const brand = await BrandProfile.findOne({ whatsappWABAId: "2403047170105280" });
  if (!brand) {
    console.log("Brand not found for WABA 2403047170105280");
    process.exit(1);
  }

  const token = brand.get('whatsappAccessToken');
  console.log("Found token, attempting to subscribe WABA to app...");

  try {
    const res = await axios.post(`https://graph.facebook.com/v25.0/2403047170105280/subscribed_apps`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Successfully subscribed App to WABA:", res.data);
  } catch (err) {
    console.error("Failed to subscribe:", err.response?.data || err.message);
  }

  process.exit(0);
}
check();
