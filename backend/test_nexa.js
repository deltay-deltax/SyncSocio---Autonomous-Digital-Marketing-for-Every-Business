import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { handleIncomingMessage } from './services/nexaAgent.js';



async function testNexaImage() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syncsocio');

  const dummyBrand = {
    _id: new mongoose.Types.ObjectId(),
    brandName: 'Test Brand',
    brandTone: 'friendly',
    user: new mongoose.Types.ObjectId(),
  };

  const dummySettings = {
    nexa_enabled: true,
  };

  const dummyConvo = {
    _id: new mongoose.Types.ObjectId(),
    stage: 'QUALIFYING',
    origin: 'direct_dm',
    conversation_history: [],
    collected: {},
    product_catalog_snapshot: [
      {
        name: 'Cool Red Shirt',
        price: 500,
        offerPrice: 400,
        description: 'A very cool red shirt',
        imageBase64: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      }
    ],
    update: async function(data) { console.log('Mock update called'); return this; }
  };
  
  // mock the Mongoose Model method updateOne 
  const NexaConversation = (await import('./models/NexaConversation.js')).default;
  NexaConversation.updateOne = async () => {};

  console.log('Sending message to Nexa: "I want to buy the Cool Red Shirt. Can I see it?"');
  
  try {
    const result = await handleIncomingMessage({
      convo: dummyConvo,
      incomingText: "I want to buy the Cool Red Shirt. Can I see it?",
      imageUrl: null,
      brandDoc: dummyBrand,
      nexaSettings: dummySettings,
      sendStandardMessage: async () => {}, // Mock
      pageToken: 'dummyToken',
      pageId: 'dummyPageId'
    });

    console.log('--- NEXA RESULT ---');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.productImageUrlToSend === 'https://res.cloudinary.com/demo/image/upload/sample.jpg') {
      console.log('✅ TEST PASSED: Nexa successfully returned the correct product image URL.');
    } else {
      console.log('❌ TEST FAILED: Nexa did not return the expected product image URL.');
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testNexaImage();
