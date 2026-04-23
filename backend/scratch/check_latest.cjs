
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const BrandProfile = mongoose.model('BrandProfile', new mongoose.Schema({}, { strict: false }));
  const profile = await BrandProfile.findOne().sort({ createdAt: -1 });
  console.log('Latest Profile:', JSON.stringify(profile, null, 2));
  await mongoose.disconnect();
}

check();
