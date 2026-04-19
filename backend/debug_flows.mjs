const { MongoClient, ObjectId } = await import('mongodb');
const dotenv = await import('dotenv');
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db();

const profile = await db.collection('brandprofiles').findOne({ instagramUsername: 'wefix_25' });
console.log('Instagram profile belongs to user:', profile.user.toString());
console.log('');

const cursor = db.collection('dmflows').find({});
const flows = await cursor.toArray();
console.log('Total flows found:', flows.length);

for (const f of flows) {
  const match = f.user.toString() === profile.user.toString() ? 'MATCHES' : 'WRONG USER';
  console.log(`[${match}] Flow: "${f.name}" | keyword: "${f.keyword}" | user: ${f.user.toString()}`);
  if (f.messages && f.messages.length > 0) {
    const msg = f.messages[0];
    console.log(`  text: "${msg.text || ''}"`);
    console.log(`  buttons: ${JSON.stringify(msg.buttons || [])}`);
  }
  console.log('');
}

await client.close();
