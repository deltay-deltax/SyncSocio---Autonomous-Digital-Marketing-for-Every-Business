import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import BrandProfile from './models/BrandProfile.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  const profile = await BrandProfile.findOne({ brandName: 'MuscleBlaze' });
  if (!profile) {
    console.log('Profile not found');
    process.exit(1);
  }

  const WHATSAPP_ACCESS_TOKEN = profile.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const WHATSAPP_PHONE_NUMBER_ID = profile.whatsappPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  console.log('Phone ID:', WHATSAPP_PHONE_NUMBER_ID);

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
            { type: 'text', text: 'Test message body' }
          ]
        }
      ]
    }
  };

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
  process.exit(0);
}

run();
