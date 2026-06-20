import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB successfully.");
    
    // Get DB stats
    const stats = await mongoose.connection.db.command({ dbStats: 1 });
    console.log("\n--- DB STATS ---");
    console.log(`Database Name: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Size (Storage + Index): ${((stats.storageSize + stats.indexSize) / 1024 / 1024).toFixed(2)} MB`);

    // Find the user
    console.log("\n--- USER QUERY ---");
    const user = await mongoose.connection.db.collection('users').findOne({ email: 'guptaaaditya418031@gmail.com' });
    if (user) {
      console.log("User found:");
      console.log(`ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Is Verified: ${user.isVerified}`);
      console.log(`Has Password: ${!!user.password}`);
      console.log(`Google ID: ${user.googleId || 'None'}`);
      console.log(`Apple ID: ${user.appleId || 'None'}`);
    } else {
      console.log("User 'guptaaaditya418031@gmail.com' NOT found in 'users' collection.");
      
      // Let's list collections and maybe check if there are any users at all
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log("\nCollections list:", collections.map(c => c.name));
      
      const count = await mongoose.connection.db.collection('users').countDocuments();
      console.log(`Total users in collection: ${count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
