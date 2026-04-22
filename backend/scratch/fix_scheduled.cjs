const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Post = mongoose.model('PostAnalysis', new mongoose.Schema({}, { strict: false, collection: 'post_analyses' }));
    
    // Any post that has a permanentUrl and is currently 'scheduled' should be 'published'
    const res = await Post.updateMany(
      { 
        status: 'scheduled', 
        permanentUrl: { $exists: true, $ne: '' } 
      }, 
      { $set: { status: 'published' } }
    );
    
    console.log(`Updated ${res.modifiedCount} posts from scheduled to published.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
