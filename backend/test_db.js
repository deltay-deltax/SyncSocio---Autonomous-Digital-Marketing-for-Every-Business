import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const originalUri = process.env.MONGO_URI;
// This fallback URI replaces the +srv with direct hostnames resolved via independent DNS
const fallbackUri = "mongodb://aaditya303gupta_db_user:9BYuNNvzSla0gSRo@ac-hagoozx-shard-00-00.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-01.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-02.lzjkbau.mongodb.net:27017/?ssl=true&replicaSet=atlas-5j7gs0-shard-0&authSource=admin&retryWrites=true&w=majority";

async function testConnection(uri, label) {
  console.log(`\n--- Testing ${label} ---`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ ${label} connection successful!`);
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error(`❌ ${label} failed:`, error.message);
    return false;
  }
}

async function run() {
  const srvResult = await testConnection(originalUri, "SRV URI (+srv)");
  
  if (!srvResult) {
    console.log("\nAttempting fallback connection string...");
    const fallbackResult = await testConnection(fallbackUri, "Fallback URI (Direct Hosts)");
    
    if (fallbackResult) {
      console.log("\nSuccess! You should update your .env with the fallback URI.");
    } else {
      console.log("\nBoth methods failed. This likely means the university firewall is blocking port 27017 entirely.");
      console.log("Recommendation: Try using a VPN to bypass the university's network restrictions.");
    }
  }
  process.exit(0);
}

run();
