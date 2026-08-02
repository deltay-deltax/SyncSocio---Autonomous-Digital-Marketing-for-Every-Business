import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import BrandProfile from './models/BrandProfile.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const profile = await BrandProfile.findOne({ whatsappWABAId: '27222347354058430' });
  
  const WHATSAPP_ACCESS_TOKEN = profile.whatsappAccessToken;
  const WHATSAPP_PHONE_NUMBER_ID = profile.whatsappPhoneId;

  const messageText = `*WhatsApp Campaign*

Diwali Blast Alert! 💥 Ready to power up your festive season? 💪

Introducing bGreen Plant Protein – your vegan muscle-building partner! 🌱 Get 25g of pure plant power per scoop, ideal for everyone, for just ₹1499.

Grab yours now: https://www.muscleblaze.com/

Happy Diwali & Happy Gains! ✨`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '918737923714',
    type: 'template',
    template: {
      name: 'custom_campaign_image',
      language: { code: 'en_US' },
      components: [
        {
          type: 'header',
          parameters: [ { type: 'image', image: { link: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e' } } ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: messageText }
          ]
        }
      ]
    }
  };

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
    );
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', JSON.stringify(err.response?.data || err.message, null, 2));
  }
  process.exit(0);
}

run();
