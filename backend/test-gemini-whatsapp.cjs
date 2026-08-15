require('dotenv').config();
const axios = require('axios');

async function run() {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const prompt = `You are an expert WhatsApp marketing copywriter. Your job is to fill template variables for a campaign message.

Brand: Dancing Cow
Industry: Food & Beverage
Brand Tone: Warm & Friendly
Target Audience: Parents & Families, Students & Young Adults
Brand Keywords: Oat milk, dairy alternative, vegan, healthy, plant-based
USP: Nutritious oat milk without preservatives or added sugar, perfect for a healthier lifestyle.

The user wants to send a WhatsApp campaign about: "a general promotion"

The template has 3 variables ({{1}} through {{3}}).
Template structure: "Hello!

*{{1}}*

{{2}}

{{3}}

Tap the button below to shop now."

Generate the best content for each variable. Return a JSON object with keys "1" through "3".

Rules:
1. ALWAYS correct any spelling or grammar mistakes in the user's idea (e.g. "ofer" → "offer", "raksha bandhan" → "Raksha Bandhan").
2. Adapt the copy to match the brand's industry, tone, and audience — do NOT write generic filler.
3. Make it highly attractive and eye-catching like modern D2C brands (e.g., Swish, Comet). 
4. Use emojis creatively and strategically! Place them at the end of impactful sentences, or use them as bullet points (e.g., 🛵, 💯, 🤘, 💸, ‼️). Do NOT  spam them, but use them to make the message visually appealing.
5. You can use WhatsApp markdown inside the variables to format text (e.g., *bold text* for emphasis on offers, dates, or key phrases). 
6. Variable {{1}} is always the main headline — keep it under 50 characters, attention-grabbing, specific to the campaign.
7. Variable {{2}} onwards should expand the message with distinct pieces of information (main offer, details, bullet points, urgency).
8. Do NOT include "Powered by SyncSocio" or any platform branding.
9. Do NOT include sign-offs like "Best", "Regards", "Team".
10. Output ONLY valid JSON, nothing else.`;

  console.log("Sending request to Gemini...");
  try {
    const start = Date.now();
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300, responseMimeType: 'application/json' }
      },
      { timeout: 45000 }
    );
    const end = Date.now();
    console.log(`Success in ${end - start}ms:`, JSON.stringify(geminiRes.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) console.error("Response:", err.response.data);
  }
}

run();
