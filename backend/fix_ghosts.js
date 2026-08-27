import mongoose from 'mongoose';

const uri = "mongodb://aaditya303gupta_db_user:9BYuNNvzSla0gSRo@ac-hagoozx-shard-00-00.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-01.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-02.lzjkbau.mongodb.net:27017/?ssl=true&replicaSet=atlas-5j7gs0-shard-0&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(uri).then(async () => {
  const AgentActivity = (await import('./models/AgentActivity.js')).default;
  const res = await AgentActivity.updateMany({ status: 'active' }, { $set: { status: 'error', message: 'Force stopped by Admin' }});
  console.log('Fixed ghosts:', res);
  process.exit(0);
}).catch(console.error);
