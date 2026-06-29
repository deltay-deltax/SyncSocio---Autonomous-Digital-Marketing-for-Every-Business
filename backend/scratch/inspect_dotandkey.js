import mongoose from 'mongoose';

const fallbackUri = "mongodb://aaditya303gupta_db_user:9BYuNNvzSla0gSRo@ac-hagoozx-shard-00-00.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-01.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-02.lzjkbau.mongodb.net:27017/?ssl=true&replicaSet=atlas-5j7gs0-shard-0&authSource=admin&retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(fallbackUri);
    const BrandProfile = mongoose.model('BrandProfile', new mongoose.Schema({}, { strict: false }));
    const p = await BrandProfile.findOne({ brandName: 'Dot & Key' });
    if (p) {
      console.log('Dot & Key Profile in DB:');
      console.log(JSON.stringify(p.toObject(), null, 2));
    } else {
      console.log('Dot & Key Profile not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
