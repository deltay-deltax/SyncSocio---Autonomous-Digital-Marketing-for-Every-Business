const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Post = mongoose.model('PostAnalysis', new mongoose.Schema({}, { strict: false, collection: 'post_analyses' }));
    
    // Find published posts that are still in the future and move them to 'now'
    const now = new Date();
    const res = await Post.updateMany(
      { 
        status: 'published', 
        scheduledAt: { $exists: true, $ne: null }
      }, 
      [
        {
          $set: {
            scheduledAt: {
              $cond: {
                if: { $gt: [{ $toDate: "$scheduledAt" }, now] },
                then: now.toISOString(),
                else: "$scheduledAt"
              }
            }
          }
        }
      ]
    );
    
    console.log(`Updated ${res.modifiedCount} future-dated published posts to 'Now'.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
