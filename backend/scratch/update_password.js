import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB successfully.");

    const newPassword = 'Aadi@8416';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'guptaaaditya418031@gmail.com' },
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount > 0) {
      console.log(`Successfully updated password for 'guptaaaditya418031@gmail.com' to '${newPassword}'.`);
    } else {
      console.log("User 'guptaaaditya418031@gmail.com' not found to update.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
