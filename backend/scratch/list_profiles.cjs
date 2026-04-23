
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const BrandProfile = mongoose.model('BrandProfile', new mongoose.Schema({}, { strict: false }));
  const profiles = await BrandProfile.find({}).limit(5);
  console.log('Profiles Found:', profiles.length);
  profiles.forEach(p => console.log('User:', p.user, 'Brand:', p.brandName));
  await mongoose.disconnect();
}

check();
