const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Post = mongoose.model('PostAnalysis', new mongoose.Schema({}, { strict: false, collection: 'post_analyses' }));
    
    const posts = await Post.find({ status: 'analyzed' });
    posts.forEach(p => {
      console.log(`- ID: ${p._id}, isScheduled: ${p.isScheduled}, Description: ${p.description.substring(0, 30)}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
