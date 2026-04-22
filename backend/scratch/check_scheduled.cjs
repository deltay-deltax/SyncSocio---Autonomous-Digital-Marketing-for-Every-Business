const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Post = mongoose.model('PostAnalysis', new mongoose.Schema({}, { strict: false, collection: 'post_analyses' }));
    
    const posts = await Post.find({ status: 'scheduled' });
    console.log(`Found ${posts.length} scheduled posts:`);
    posts.forEach(p => {
      console.log(`- ID: ${p._id}, Title: ${p.description.substring(0, 20)}, PermanentUrl: ${p.permanentUrl || 'NONE'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
