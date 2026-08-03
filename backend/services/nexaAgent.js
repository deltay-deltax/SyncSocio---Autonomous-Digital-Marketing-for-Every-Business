/**
 * nexaAgent.js
 * Core Nexa DM Sales Agent — uses OpenAI GPT-4o to run a structured
 * state-machine conversation over Instagram DMs.
 */

import OpenAI from 'openai';
import NexaConversation from '../models/NexaConversation.js';
import BrandProfile from '../models/BrandProfile.js';
import Product from '../models/Product.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'missing_key' });

// ─── Valid stage transitions ──────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  AWAITING_FOLLOWUP:   ['GREETING', 'QUALIFYING'],
  GREETING:            ['QUALIFYING', 'ESCALATED'],
  QUALIFYING:          ['NEGOTIATING', 'COLLECTING_DETAILS', 'ESCALATED'],
  NEGOTIATING:         ['COLLECTING_DETAILS', 'ESCALATED'],
  COLLECTING_DETAILS:  ['CONFIRMING', 'ESCALATED'],
  CONFIRMING:          ['CLOSED', 'NEGOTIATING', 'ESCALATED'],
  CLOSED:              [],
  ESCALATED:           [],
};

const isValidTransition = (from, to) => {
  if (!VALID_TRANSITIONS[from]) return false;
  return VALID_TRANSITIONS[from].includes(to);
};

// ─── Build the system prompt ───────────────────────────────────────────────────
const buildSystemPrompt = (brandDoc, convo, nexaSettings) => {
  const brandName      = brandDoc.brandName || 'Brand';
  const brandTone      = brandDoc.brandTone || 'friendly and helpful';
  const catalogStr     = JSON.stringify(convo.product_catalog_snapshot || [], null, 2);
  const collectedStr   = JSON.stringify(convo.collected, null, 2);
  const historyStr     = convo.conversation_history
    .slice(-20) // last 20 turns to stay within token budget
    .map(h => `${h.role === 'user' ? 'Customer' : 'Nexa'}: ${h.text}`)
    .join('\n');

  const paymentOptions = [];
  if (nexaSettings?.razorpay_connected && nexaSettings?.razorpay_key_id) paymentOptions.push('Razorpay payment link');
  if (nexaSettings?.upi_id) paymentOptions.push(`UPI (${nexaSettings.upi_id})`);
  if (nexaSettings?.bank_details) paymentOptions.push('Bank transfer');
  if (nexaSettings?.cod_enabled) paymentOptions.push('Cash on Delivery (COD)');
  const paymentOptionsStr = paymentOptions.length > 0 ? paymentOptions.join(', ') : 'COD only';

  const minDiscount = nexaSettings?.min_discount ?? 0;
  const maxDiscount = nexaSettings?.max_discount ?? 0;

  const originNote = convo.origin === 'comment_trigger' && convo.collected?.product_interested
    ? `\nNOTE: This customer commented on a post about "${convo.collected.product_interested}" and received the product info. Skip basic introductions — they already know what they want. Start directly where the conversation left off.\n`
    : '';

  return `You are Nexa, the AI Sales Assistant for ${brandName} on Instagram.
You reply to DMs on behalf of ${brandName} in their brand voice: ${brandTone}.
Your job: answer questions, qualify interest, negotiate within approved bounds, and close the sale.
${originNote}
═══════════ BRAND CONTEXT ═══════════
BRAND: ${brandName}
PRODUCTS/CATALOG:
${catalogStr}
USP: ${brandDoc.usp || ''}
TONE: ${brandTone}
APPROVED DISCOUNT RANGE: ${minDiscount}% – ${maxDiscount}% (NEVER exceed this without escalating)
PAYMENT OPTIONS AVAILABLE: ${paymentOptionsStr}

═══════════ CONVERSATION STATE ═══════════
CURRENT STAGE: ${convo.stage}
ALREADY COLLECTED:
${collectedStr}
CONVERSATION HISTORY:
${historyStr || '(no history yet)'}

═══════════ STAGE RULES (STRICT) ═══════════
1. GREETING: Warm, brief. Ask what they're interested in if unclear. Never jump to price questions.
2. QUALIFYING: Identify the specific product. Use ONLY catalog info — never invent prices, specs, or stock.
3. NEGOTIATING: Offer discounts ONLY within ${minDiscount}%–${maxDiscount}%. If pushed beyond, say "let me check with the team" and set escalate_to_human=true.
4. COLLECTING_DETAILS: Once price is agreed, collect ONE AT A TIME in this order:
   a) Customer's name  b) Product + quantity  c) Confirm final price  d) Full delivery address  e) Phone number
5. CONFIRMING: Read back everything. Ask payment preference from: ${paymentOptionsStr}
   - If Razorpay: set payment_link_requested=true. Say "sending a secure link now" — DO NOT invent a URL.
   - If UPI: provide the UPI ID from context. Tell them to send to ${nexaSettings?.upi_id || '[UPI ID]'} and share a screenshot.
   - If Bank transfer: share the bank details. Tell them to send and share a screenshot.
   - If COD: set payment_mode="cod" in collected. Move to CLOSED.
8. CLOSED: Thank them warmly. Say the team will confirm shortly. Do NOT re-negotiate.
9. ESCALATION (HUMAN REQUEST): If the customer explicitly asks to talk to a human or agent, acknowledge this, say "Our team will connect with you shortly," set escalate_to_human=true, and set new_stage="ESCALATED".

═══════════ HARD RULES ═══════════
- NEVER ask for card numbers, CVV, OTPs, or any sensitive payment credentials in DM.
- NEVER write out, guess, or invent a payment link URL. Say "the link is coming in your next message."
- NEVER fabricate stock, delivery timelines, or discounts not listed above.
- Keep messages EXTREMELY short and concise. Use bullet points instead of long paragraphs to make it highly readable in Instagram DMs.
- If the customer asks something outside your knowledge: set escalate_to_human=true and new_stage="ESCALATED".

═══════════ OUTPUT FORMAT ═══════════
Respond ONLY with valid JSON (no markdown, no backticks):
{
  "reply_text": "your message to the customer",
  "new_stage": "one of: GREETING|QUALIFYING|NEGOTIATING|COLLECTING_DETAILS|CONFIRMING|CLOSED|ESCALATED",
  "updated_collected_fields": {},
  "payment_link_requested": false,
  "escalate_to_human": false
}`;
};

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handleIncomingMessage = async ({ convo, incomingText, brandDoc, nexaSettings, sendStandardMessage, pageToken, pageId }) => {
  // 1. Build prompt
  const systemPrompt = buildSystemPrompt(brandDoc, convo, nexaSettings);

  // 2. Call GPT-4o
  let parsed;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: incomingText },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    // Strip any accidental markdown code fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error('[Nexa] GPT call or JSON parse failed:', err.message);
    parsed = {
      reply_text: "Hey! I'm having a small hiccup — our team will follow up with you shortly 😊",
      new_stage: convo.stage,
      updated_collected_fields: {},
      payment_link_requested: false,
      escalate_to_human: false,
    };
  }

  // 3. Validate stage transition server-side
  const proposedStage = parsed.new_stage;
  const finalStage = (proposedStage && isValidTransition(convo.stage, proposedStage))
    ? proposedStage
    : convo.stage;

  // 4. Merge collected fields
  const mergedCollected = { ...convo.collected.toObject?.() || convo.collected };
  if (parsed.updated_collected_fields && typeof parsed.updated_collected_fields === 'object') {
    Object.assign(mergedCollected, parsed.updated_collected_fields);
  }

  // 5. Update conversation in DB
  const newHistoryEntry = { role: 'user', text: incomingText, ts: new Date() };
  const nexaHistoryEntry = { role: 'nexa', text: parsed.reply_text, ts: new Date() };

  const updateData = {
    stage: parsed.escalate_to_human ? 'ESCALATED' : finalStage,
    collected: mergedCollected,
    escalate_to_human: !!parsed.escalate_to_human,
    $push: { conversation_history: { $each: [newHistoryEntry, nexaHistoryEntry] } },
  };

  await NexaConversation.updateOne({ _id: convo._id }, updateData);

  return {
    replyText: parsed.reply_text,
    newStage: updateData.stage,
    paymentLinkRequested: !!parsed.payment_link_requested,
    escalate: !!parsed.escalate_to_human,
    mergedCollected,
  };
};

// ─── Create or retrieve conversation from a comment trigger ───────────────────
export const upsertNexaConversationFromComment = async ({
  brandDoc,
  igUserId,
  dmFlowId,
  productInterested,
  priceAgreed,
}) => {
  const nudgeDueAt = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes

  // Fetch live product catalog for the brand
  let productCatalog = [];
  try {
    productCatalog = await Product.find({ user: brandDoc.user }).select('name price keyBenefit description').lean();
  } catch (e) {
    console.error('[Nexa] Failed to fetch products for catalog snapshot:', e.message);
  }

  const doc = await NexaConversation.findOneAndUpdate(
    { brand_id: brandDoc._id, ig_user_id: igUserId },
    {
      $setOnInsert: {
        user: brandDoc.user,
        brand_id: brandDoc._id,
        ig_user_id: igUserId,
        stage: 'AWAITING_FOLLOWUP',
        origin: 'comment_trigger',
        dm_flow_id: dmFlowId || null,
        nudge_due_at: nudgeDueAt,
        nudge_sent: false,
        product_catalog_snapshot: productCatalog,
        'collected.product_interested': productInterested || null,
        'collected.price_agreed': priceAgreed || null,
        conversation_history: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Nexa] Conversation ${doc._id} created/found for IG user ${igUserId} | nudge due at ${nudgeDueAt.toISOString()}`);
  return doc;
};

// ─── Create or retrieve conversation from a direct DM ────────────────────────
export const upsertNexaConversationFromDM = async ({
  brandDoc,
  igUserId,
}) => {
  // Fetch live product catalog for the brand
  let productCatalog = [];
  try {
    productCatalog = await Product.find({ user: brandDoc.user }).select('name price keyBenefit description').lean();
  } catch (e) {
    console.error('[Nexa] Failed to fetch products for catalog snapshot:', e.message);
  }

  const doc = await NexaConversation.findOneAndUpdate(
    { brand_id: brandDoc._id, ig_user_id: igUserId },
    {
      $setOnInsert: {
        user: brandDoc.user,
        brand_id: brandDoc._id,
        ig_user_id: igUserId,
        stage: 'GREETING',
        origin: 'direct_dm',
        nudge_sent: false,
        product_catalog_snapshot: productCatalog,
        conversation_history: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Nexa] Conversation ${doc._id} created/found from direct DM for IG user ${igUserId}`);
  return doc;
};
