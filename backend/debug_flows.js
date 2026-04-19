import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const profile = await mongoose.connection.db.collection('brandprofiles').findOne({ instagramUsername: 'wefix_25' });
console.log('Instagram profile belongs to user:', profile.user.toString());
console.log('');

const flows = await mongoose.connection.db.collection('dmflows').find({}).toArray();
for (const f of flows) {
  const match = f.user.toString() === profile.user.toString() ? '✅ MATCHES' : '❌ WRONG USER';
  console.log(`${match} | Flow: "${f.name}" | keyword: "${f.keyword}" | user: ${f.user.toString()}`);
  console.log(`  messages:`, JSON.stringify(f.messages));
  console.log('');
}

await mongoose.disconnect();
