import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await mongoose.connection.db.collection('users').countDocuments();
  const coupons = await mongoose.connection.db.collection('coupons').countDocuments();
  console.log('Users:', users, 'Coupons:', coupons);
  process.exit(0);
});
