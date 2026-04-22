const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const collection = db.collection('post_analyses');

    const now = new Date();
    
    // Find published posts that are in the future
    const res = await collection.updateMany(
      { 
        status: 'published'
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
    
    console.log(`Updated ${res.modifiedCount} posts to 'Now'.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
