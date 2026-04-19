import 'dotenv/config';
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const flows = await mongoose.connection.db.collection('dmflows').find().toArray();
  console.log(JSON.stringify(flows, null, 2));
  process.exit(0);
});
