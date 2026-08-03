import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const BrandProfileSchema = new mongoose.Schema({}, { strict: false });
const BrandProfile = mongoose.model('BrandProfile', BrandProfileSchema, 'brandprofiles');

const templates = [
  // 1. syncsocio_promo_shop
  {
    name: "syncsocio_promo_shop",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Mega Summer Sale — Up to 60% OFF!", "Hey there! Our biggest sale of the season is LIVE."]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Shop Now", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 2. syncsocio_promo_claim
  {
    name: "syncsocio_promo_claim",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Exclusive 30% OFF — Just for You!", "As a valued customer, we have a special surprise for you!"]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Claim Offer", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 3. syncsocio_promo_visit
  {
    name: "syncsocio_promo_visit",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Exciting News from Our Team!", "We have been working on something special and we cannot wait to show you."]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Visit Website", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 4. syncsocio_promo_book
  {
    name: "syncsocio_promo_book",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Limited Slots Available — Book Today!", "Our expert consultations are filling up fast this month!"]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Book Now", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 5. syncsocio_promo_order
  {
    name: "syncsocio_promo_order",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Fresh Menu Launch — Try Our New Specials!", "Craving something delicious? We have just launched our brand new menu."]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Order Now", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 6. syncsocio_promo_learn
  {
    name: "syncsocio_promo_learn",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Free Masterclass This Weekend!", "Join our industry experts for an exclusive live masterclass on digital marketing strategies."]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Learn More", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 7. syncsocio_promo_get
  {
    name: "syncsocio_promo_get",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Your Free Guide Is Ready!", "We have put together a comprehensive guide packed with actionable tips."]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Get It Free", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 8. syncsocio_festival
  {
    name: "syncsocio_festival",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Diwali Special — Light Up Your Savings!", "Wishing you and your family a very Happy Diwali!"]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Celebrate Now", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 9. syncsocio_promo_text
  {
    name: "syncsocio_promo_text",
    language: "en_US",
    category: "MARKETING",
    components: [
      { type: "BODY", text: "Hello! 👋\n\n*{{1}}*\n\n{{2}}\n\nThank you for choosing us.", example: { body_text: [["Quick Update for You!", "Hey there! Just a quick heads up — our store timings have been updated for the holiday season."]] } },
      { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "View Details", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 10. syncsocio_order_confirmed_v2
  {
    name: "syncsocio_order_confirmed_v2",
    language: "en_US",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello {{1}}, thank you for your order!\n\nYour order #{{2}} has been confirmed and is being processed. We will notify you once it ships.\n\nYour total of INR {{3}} has been successfully received.", example: { body_text: [["Rahul", "ORD-29847", "1,499"]] } },
      { type: "FOOTER", text: "Need help? Reply to this message." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "View Order", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 11. syncsocio_order_shipped_v2
  {
    name: "syncsocio_order_shipped_v2",
    language: "en_US",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello {{1}}, great news! Your order #{{2}} has been shipped.\n\nCourier: {{3}}\nTracking ID: {{4}}\nEstimated Delivery: {{5}}\n\nTrack your package using the link below.", example: { body_text: [["Priya", "ORD-30021", "Delhivery", "DL98374652IN", "2 Aug 2025"]] } },
      { type: "FOOTER", text: "Need help? Reply to this message." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Track Order", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 12. syncsocio_payment_reminder_v2
  {
    name: "syncsocio_payment_reminder_v2",
    language: "en_US",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello {{1}}, this is a friendly reminder that a payment of INR {{2}} is due on {{3}} for your order #{{4}}.\n\nPlease complete the payment at your earliest convenience to avoid any delays in processing.", example: { body_text: [["Amit", "2,999", "5 Aug 2025", "INV-10234"]] } },
      { type: "FOOTER", text: "Need help? Reply to this message." },
      { type: "BUTTONS", buttons: [{ type: "URL", text: "Pay Now", url: "https://www.syncsocio.com/{{1}}" }] }
    ]
  },
  // 13. syncsocio_appointment_reminder_v3
  {
    name: "syncsocio_appointment_reminder_v3",
    language: "en_US",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "IMAGE", example: { header_handle: [] } },
      { type: "BODY", text: "Hello {{1}}, just a reminder about your upcoming appointment.\n\nDate: {{2}}\nTime: {{3}}\nLocation: {{4}}\n\nPlease arrive 10 minutes early. If you need to reschedule, reply to this message or call us.", example: { body_text: [["Sneha", "3 Aug 2025", "11:00 AM", "HealthFirst Clinic, Andheri West, Mumbai"]] } },
      { type: "FOOTER", text: "Thank you for choosing us." },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirm" }, { type: "QUICK_REPLY", text: "Reschedule" }] }
    ]
  }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const profile = await BrandProfile.findOne({ whatsappWABAId: { $exists: true, $ne: '' }, whatsappAccessToken: { $exists: true, $ne: '' } });
    if (!profile) {
      console.log('No brand profile found with WhatsApp credentials');
      process.exit(1);
    }

    const { whatsappWABAId, whatsappAccessToken, website } = profile;
    console.log(`Found profile: WABA=${whatsappWABAId}`);

    const baseDomain = website && website.startsWith('http') ? website : 'https://www.syncsocio.com';
    console.log(`Using base domain for buttons: ${baseDomain}`);

    // Update button URLs in templates to use baseDomain
    templates.forEach(t => {
      const buttonComp = t.components.find(c => c.type === 'BUTTONS');
      if (buttonComp && buttonComp.buttons) {
        buttonComp.buttons.forEach(b => {
          if (b.type === 'URL' && b.url.includes('syncsocio.com')) {
            b.url = `${baseDomain}/{{1}}`;
            b.example = [`${baseDomain}/diwali-sale`]; // Meta requires an example for dynamic URLs
          } else if (b.type === 'URL' && b.url.includes('{{1}}')) {
            b.example = [`${b.url.replace('{{1}}', 'diwali-sale')}`];
          }
        });
      }
    });

    // Obtain a real sample media handle from Meta's Resumable Upload API
    const appId = process.env.INSTAGRAM_CLIENT_ID || process.env.FB_APP_ID || '1491990322515220';
    let sampleHandle = null;
    try {
      const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const sessionRes = await axios.post(
        `https://graph.facebook.com/v21.0/${appId}/uploads`,
        null,
        { params: { file_length: samplePng.length, file_type: 'image/png', access_token: whatsappAccessToken } }
      );
      const sessionId = sessionRes.data?.id;
      if (sessionId) {
        const uploadRes = await axios.post(
          `https://graph.facebook.com/v21.0/${sessionId}`,
          samplePng,
          { headers: { 'Authorization': `OAuth ${whatsappAccessToken}`, 'file_offset': 0, 'Content-Type': 'image/png' } }
        );
        sampleHandle = uploadRes.data?.h || null;
      }
    } catch (e) {
      console.warn('Failed to get sample handle. Will remove image headers from payload.', e.message);
    }

    // Submit templates
    for (const t of templates) {
      // Inject sample handle if template has image header
      const headerComp = t.components.find(c => c.type === 'HEADER');
      if (headerComp && headerComp.format === 'IMAGE') {
        if (sampleHandle) {
          headerComp.example.header_handle = [sampleHandle];
        } else {
          console.warn(`Skipping template ${t.name} because sample media handle failed.`);
          continue;
        }
      }

      try {
        await axios.post(
          `https://graph.facebook.com/v21.0/${whatsappWABAId}/message_templates`,
          t,
          { headers: { Authorization: `Bearer ${whatsappAccessToken}` } }
        );
        console.log(`✅ Created: ${t.name}`);
      } catch (err) {
        const errorDetail = err?.response?.data?.error;
        if (errorDetail && errorDetail.message && errorDetail.message.includes('already exists')) {
          console.log(`ℹ️ Already Exists: ${t.name}`);
        } else {
          console.error(`❌ Failed: ${t.name}`, JSON.stringify(errorDetail, null, 2) || err.message);
        }
      }
    }
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    process.exit(0);
  }
}

run();
