import mongoose from 'mongoose';

async function check() {
  try {
    await mongoose.connect('mongodb://aaditya303gupta_db_user:9BYuNNvzSla0gSRo@ac-hagoozx-shard-00-00.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-01.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-02.lzjkbau.mongodb.net:27017/syncsocio?ssl=true&replicaSet=atlas-5j7gs0-shard-0&authSource=admin&retryWrites=true&w=majority');
    const db = mongoose.connection.db;
    const settings = await db.collection('sitesettings').findOne({});
    console.log(JSON.stringify(settings, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
