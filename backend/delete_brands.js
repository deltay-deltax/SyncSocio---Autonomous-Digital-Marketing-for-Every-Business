import mongoose from 'mongoose'; 
import dotenv from 'dotenv'; 
dotenv.config(); 
import BrandProfile from './models/BrandProfile.js'; 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const result = await BrandProfile.deleteMany({ brandName: /wefix/i }); 
  console.log('Deleted brands:', result.deletedCount); 
  process.exit(0); 
});
