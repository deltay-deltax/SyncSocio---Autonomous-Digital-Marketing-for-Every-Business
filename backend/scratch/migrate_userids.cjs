const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Post = mongoose.model('PostAnalysis', new mongoose.Schema({}, { strict: false, collection: 'post_analyses' }));
    
    // Convert string userIds to ObjectIds
    const posts = await Post.find({ userId: { $type: 'string' } });
    console.log(`Found ${posts.length} posts with string userId`);

    for (const post of posts) {
      if (mongoose.Types.ObjectId.isValid(post.userId)) {
        post.userId = new mongoose.Types.ObjectId(post.userId);
        await post.save();
      }
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
