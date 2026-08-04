import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const nexaConversationSchema = new mongoose.Schema({
  ig_user_id: String,
  collected: Object,
  conversation_history: Array
}, { collection: 'nexa_conversations' });

const NexaConversation = mongoose.model('NexaConversation', nexaConversationSchema);

async function checkConvo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const convo = await NexaConversation.findOne({ _id: '6a717f1c7a7c2c4b161e3412' }).lean();
    if (convo) {
      console.log('--- LAST 10 MESSAGES ---');
      const hist = convo.conversation_history || [];
      console.log(JSON.stringify(hist.slice(-10), null, 2));
    } else {
      console.log('Conversation not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

checkConvo();
