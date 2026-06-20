import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB successfully.");

    const user = await mongoose.connection.db.collection('users').findOne({ email: 'guptaaaditya418031@gmail.com' });
    if (!user) {
      console.log("User not found.");
      process.exit(1);
    }

    const testPassword = 'Aadi@8416';
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Checking password '${testPassword}' against hash in DB...`);
    console.log(`Is Match: ${isMatch}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
