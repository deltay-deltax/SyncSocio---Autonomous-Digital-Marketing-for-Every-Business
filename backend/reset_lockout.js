import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const reset = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log(`Connecting to: ${uri}`);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Reset lockout and also ensure the profile has USP/Painpoint for the AI
    const result = await mongoose.connection.collection('brandprofiles').updateMany(
      {},
      { 
        $set: { 
          generationLockoutUntil: null,
          generationCount: 0 
        } 
      }
    );
    
    console.log(`Reset successful. Modified ${result.modifiedCount} documents.`);
    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
};

reset();
