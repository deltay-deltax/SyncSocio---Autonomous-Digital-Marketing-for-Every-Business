import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/Major_Project/backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const StrategyCreative = mongoose.connection.collection('strategycreatives');
  
  const creatives = await StrategyCreative.find({}).toArray();
  console.log(`Total creatives: ${creatives.length}`);
  
  const byBrand = {};
  let missingBrandId = 0;
  for (const c of creatives) {
    if (!c.brandId) {
      missingBrandId++;
    } else {
      const bId = c.brandId.toString();
      byBrand[bId] = (byBrand[bId] || 0) + 1;
    }
  }
  
  console.log(`Missing brandId: ${missingBrandId}`);
  console.log('By brandId:', byBrand);
  
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log(`Users:`, users.map(u => ({ id: u._id.toString(), email: u.email, activeBrand: u.activeBrandId?.toString() })));
  
  const brands = await mongoose.connection.collection('brandprofiles').find({}).toArray();
  console.log(`Brands:`, brands.map(b => ({ id: b._id.toString(), name: b.brandName, user: b.user.toString() })));
  
  mongoose.disconnect();
}
run();
