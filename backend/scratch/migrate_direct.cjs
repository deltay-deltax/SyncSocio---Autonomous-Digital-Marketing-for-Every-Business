const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db('test');
    const collection = db.collection('post_analyses');

    console.log('Connected to MongoDB');

    // Find all posts where userId is a string
    const posts = await collection.find({ userId: { $type: 'string' } }).toArray();
    console.log(`Found ${posts.length} posts with string userId`);

    for (const post of posts) {
      if (ObjectId.isValid(post.userId)) {
        await collection.updateOne(
          { _id: post._id },
          { $set: { userId: new ObjectId(post.userId) } }
        );
      }
    }

    console.log('Direct MongoDB Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
