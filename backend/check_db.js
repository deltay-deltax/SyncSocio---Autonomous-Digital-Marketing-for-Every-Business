import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const profiles = await mongoose.connection.db.collection('brandprofiles').find().toArray();
  console.log(JSON.stringify(profiles, null, 2));
  process.exit(0);
});
