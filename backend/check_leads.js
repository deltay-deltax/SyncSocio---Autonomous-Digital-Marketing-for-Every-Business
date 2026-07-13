import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const leadSchema = new mongoose.Schema({}, { strict: false });
const Lead = mongoose.model('Lead', leadSchema, 'leads'); // strict: false allows us to see all fields

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const leads = await Lead.find({}).limit(5).lean();
    console.log("Sample leads:");
    console.log(JSON.stringify(leads, null, 2));

  } catch (error) {
    console.error("Error fetching leads:", error);
  } finally {
    process.exit(0);
  }
}

run();
