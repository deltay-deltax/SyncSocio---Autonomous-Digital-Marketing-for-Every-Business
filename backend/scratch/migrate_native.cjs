const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const collection = db.collection('post_analyses');

    console.log('Connected to MongoDB via Mongoose');

    const posts = await collection.find({ userId: { $type: 'string' } }).toArray();
    console.log(`Found ${posts.length} posts with string userId`);

    for (const post of posts) {
      if (mongoose.Types.ObjectId.isValid(post.userId)) {
        await collection.updateOne(
          { _id: post._id },
          { $set: { userId: new mongoose.Types.ObjectId(post.userId) } }
        );
      }
    }

    console.log('Native Driver Migration via Mongoose complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
