const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const userIdStr = '69e5171658fc99a095748102';
    const Post = mongoose.model('PostAnalysis', new mongoose.Schema({}, { strict: false, collection: 'post_analyses' }));
    
    const posts = await Post.find({ 
      $or: [
        { userId: userIdStr },
        { userId: new mongoose.Types.ObjectId(userIdStr) }
      ]
    });
    
    console.log(`Found ${posts.length} posts for user ${userIdStr}`);
    posts.forEach(p => console.log(`- ID: ${p._id}, Status: ${p.status}, Type: ${typeof p.userId}`));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
