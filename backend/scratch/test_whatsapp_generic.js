import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function testGenericTemplate() {
  const recipient = '+918737923714'.replace('+', ''); // Use one of the user's test numbers
  const messageText = "This is a custom campaign text sent from the mock test script using generic templates!";

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: 'custom_campaign_text',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: messageText }]
        }
      ]
    }
  };

  console.log("Sending payload to WhatsApp API:", JSON.stringify(payload, null, 2));

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
    console.log(`[WhatsApp] Sent successfully!`, res.data);
  } catch (err) {
    console.error(`[WhatsApp] Failed sending:`, err?.response?.data || err.message);
  }
}

testGenericTemplate();
