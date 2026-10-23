/**
 * nexaAgent.js
 * Core Nexa DM Sales Agent — uses Google Gemini 2.5 Flash to run a structured
 * state-machine conversation over Instagram DMs.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import NexaConversation from '../models/NexaConversation.js';
import BrandProfile from '../models/BrandProfile.js';
import Product from '../models/Product.js';


// ─── Valid stage transitions ──────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  AWAITING_FOLLOWUP: ['GREETING', 'QUALIFYING'],
  GREETING: ['QUALIFYING', 'ESCALATED'],
  QUALIFYING: ['NEGOTIATING', 'COLLECTING_DETAILS', 'ESCALATED'],
  NEGOTIATING: ['COLLECTING_DETAILS', 'ESCALATED'],
  COLLECTING_DETAILS: ['CONFIRMING', 'ESCALATED'],
  CONFIRMING: ['CLOSED', 'NEGOTIATING', 'ESCALATED'],
  CLOSED: ['CLOSED', 'GREETING', 'QUALIFYING', 'ESCALATED'],
  ESCALATED: [],
};

const isValidTransition = (from, to) => {
  if (!VALID_TRANSITIONS[from]) return false;
  return VALID_TRANSITIONS[from].includes(to);
};

// ─── SaaS / Digital Detection ────────────────────────────────────────────────
export const SAAS_KEYWORDS = [
  'saas', 'software', 'tech', 'digital', 'agency', 'b2b', 'app', 'platform',
  'consulting', 'services', 'service', 'edtech', 'fintech', 'marketing', 'ai',
  'crm', 'erp', 'automation', 'cloud', 'startup', 'tool', 'dashboard',
  'subscription', 'analytics', 'plugin', 'integration', 'api', 'workflow'
];

export const checkIsSaasBrand = (brandDoc) => {
  if (!brandDoc) return false;
  const category = (brandDoc.businessCategory || '').toLowerCase();
  const otherCat = (brandDoc.otherCategory || '').toLowerCase();
  const usp = (brandDoc.usp || '').toLowerCase();
  const industry = (brandDoc.industry || '').toLowerCase();
  return SAAS_KEYWORDS.some(kw =>
    category.includes(kw) || otherCat.includes(kw) || usp.includes(kw) || industry.includes(kw)
  ) || !!brandDoc.isSaas;
};

// ─── Build the system prompt ───────────────────────────────────────────────────
const buildSystemPrompt = (brandDoc, convo, nexaSettings) => {
  const brandName = brandDoc.brandName || 'Brand';
  const brandTone = brandDoc.brandTone || 'friendly and helpful';
  const catalogStr = JSON.stringify(convo.product_catalog_snapshot || [], null, 2);
  const collectedStr = JSON.stringify(convo.collected, null, 2);

  const paymentOptions = [];
  if (nexaSettings?.razorpay_connected && nexaSettings?.razorpay_key_id) paymentOptions.push('Razorpay payment link');
  if (nexaSettings?.upi_id) {
    if (nexaSettings?.upi_qr_code_url) {
      paymentOptions.push(`UPI / QR Code (${nexaSettings.upi_id})`);
    } else {
      paymentOptions.push(`UPI (${nexaSettings.upi_id})`);
    }
  }
  if (nexaSettings?.cod_enabled) paymentOptions.push('Cash on Delivery (COD)');
  const paymentOptionsStr = paymentOptions.length > 0 ? paymentOptions.join(', ') : 'COD only';

  const minDiscount = nexaSettings?.min_discount ?? 0;
  const maxDiscount = nexaSettings?.max_discount ?? 0;

  const isSaasOrDigital = checkIsSaasBrand(brandDoc);

  // Demo booking mode: does the brand have a meeting/demo link configured?
  const demoLink = nexaSettings?.demo_booking_link || brandDoc.demoBookingLink || null;
  const hasDemoLink = !!demoLink;

  const originNote = convo.origin === 'comment_trigger' && convo.collected?.product_interested
    ? `\nNOTE: This customer commented on a post about "${convo.collected.product_interested}" and received the product info. Skip basic introductions — they already know what they want. Start directly where the conversation left off.\n`
    : '';

  const targetAudiences = brandDoc.targetAudiences && brandDoc.targetAudiences.length > 0 ? brandDoc.targetAudiences.join(', ') : 'Not specified';
  const locationStr = brandDoc.location && brandDoc.location.city ? `${brandDoc.location.city}, ${brandDoc.location.country}` : 'Not specified';

  const businessContext = nexaSettings?.business_context ? `\nBUSINESS POLICIES & CONTEXT:\n${nexaSettings.business_context}\n` : '';
  
  let knowledgeBaseStr = '';
  if (nexaSettings?.knowledge_base && nexaSettings.knowledge_base.length > 0) {
    knowledgeBaseStr = '\n═══════════ KNOWLEDGE BASE (FAQs) ═══════════\n';
    knowledgeBaseStr += 'Use these exact answers for related customer questions:\n';
    nexaSettings.knowledge_base.forEach(kb => {
      knowledgeBaseStr += `Q: ${kb.question}\nA: ${kb.answer}\n\n`;
    });
  }

  const businessTypeHeader = isSaasOrDigital
    ? `BUSINESS TYPE: SaaS / Digital Software / B2B Services (NO physical delivery)
CRITICAL SAAS INSTRUCTIONS:
- This business provides software, subscriptions, or digital services — NOT physical products.
- NEVER ask the customer for a home or physical shipping address.
- NEVER invent a price unless it is explicitly listed in the catalog.
- Your PRIMARY goal in this order of priority:
  1. DEMO / MEETING BOOKING: If the customer shows interest or asks how it works, your FIRST offer should be to book a free demo call or discovery meeting. This is more important than immediately quoting prices.
  2. Lead qualification: Understand their business needs, team size, pain points, or use-case.
  3. Plan / feature matching: Suggest the most relevant plan or service from the catalog.
  4. Lead capture: Collect Name, Work Email, Phone, and Company Name/Role.
  5. Demo/trial/subscription: Either book a demo call OR provide self-serve payment if they're ready to pay now.
${hasDemoLink ? `DEMO BOOKING LINK: ${demoLink}
- When the customer agrees to a demo or meeting, share this link and ask them to book a slot: ${demoLink}
- Set demo_booking_requested=true in your JSON output when you share this link.` : `DEMO BOOKING: When the customer agrees to a demo, collect their Name, Work Email, Company, and ask for their preferred time/day. Then confirm the team will reach out to schedule it.`}`
    : `BUSINESS TYPE: E-Commerce / D2C (Physical Products Delivery)`;

  const collectingDetailsRule = isSaasOrDigital
    ? `4. COLLECTING_DETAILS (SaaS / Demo / Lead Capture):
   a) If the customer wants a DEMO CALL or MEETING:
      Ask in ONE message for: Full Name, Work Email, Company Name, and Preferred time / day for the call.
      Do NOT ask for a physical address. Validate email contains '@' and a domain.
      CRITICAL: Save the extracted details into updated_collected_fields:
      - customer_name: Full Name
      - email: Work Email
      - company_name: Company Name
      - meeting_time: Preferred time / day for the call (e.g., "Tomorrow at 11 am")
      - phone_number: Phone (if provided)
      - order_status: "demo_booked"
      - lead_type: "saas_demo"
   b) If they are ready to SUBSCRIBE / PAY directly (self-serve):
      Ask in ONE message for: Full Name, Work Email, Phone Number (min 10 digits), and Company Name.
      Validate email and phone before moving to CONFIRMING.`
    : `4. COLLECTING_DETAILS (E-commerce / Physical Goods):
   Once price is agreed, ask the customer to provide their Name, Full Delivery Address, and Phone Number ALL AT ONCE in a single message. Do NOT ask for them one by one. CRITICAL: Validate that the phone number contains at least 10 digits and the address looks like a real physical address (not just random letters like "ABCD"). If the provided details look fake, incomplete, or invalid, politely ask them to provide a valid 10-digit phone number and complete delivery address before moving to CONFIRMING.`;

  const confirmingRule = isSaasOrDigital
    ? `5. CONFIRMING (SaaS — Demo Booking or Subscription):
   Read back their name, email, and company.
   a) DEMO / MEETING PATH (most common for SaaS):
      - Warmly confirm the demo is booked / being scheduled.
      ${hasDemoLink ? `- Share the booking link: ${demoLink} and say "Pick a time that works for you!"
      - Set demo_booking_requested=true.` : `- Tell them "Our team will reach out to your email within 24 hours to confirm the meeting time."`}
      - Set new_stage=CLOSED immediately (no payment needed for a demo).
   b) PAID SUBSCRIPTION PATH (customer is ready to pay now):
      - Ask payment preference from: ${paymentOptionsStr}.
      - If Razorpay: set payment_link_requested=true. Remain in CONFIRMING until payment is completed.
      - If UPI: provide the UPI ID. Tell them to send to ${nexaSettings?.upi_id || '[UPI ID]'} and share a screenshot.`
    : `5. CONFIRMING:
   Read back everything. Ask payment preference from: ${paymentOptionsStr}
   - If Razorpay: set payment_link_requested=true. Say "sending a secure link now" — DO NOT invent a URL. Remain in CONFIRMING until the payment is successfully completed.
   - If UPI: provide the UPI ID from context. Tell them to send to ${nexaSettings?.upi_id || '[UPI ID]'} and share a screenshot. ${nexaSettings?.upi_qr_code_url ? 'ALWAYS set send_upi_qr=true so the customer receives the QR image automatically.' : ''} Remain in CONFIRMING until they share a valid payment screenshot.
   - If COD: set payment_mode="cod" in collected. Move to CLOSED immediately.`;

  const closedRule = isSaasOrDigital
    ? `8. CLOSED: The lead is captured, demo/meeting is booked, or subscription payment completed.
   - If demo booked: Thank them warmly. Say "Looking forward to connecting! Check your email for the calendar invite — see you on the call! 🚀" Do NOT re-negotiate.
   - If paid: Thank them warmly. Say the team has sent access/confirmation to their email and will be in touch shortly.
   - If they want to explore something new, transition to QUALIFYING.`
    : `8. CLOSED: This stage means the payment is successfully verified or COD order is placed. Thank them warmly. Say the team will process their order shortly. Do NOT re-negotiate. If they want to buy something new, transition to GREETING or QUALIFYING.`;

  const currentOrderStatus = convo.order_status || (convo.stage === 'CLOSED' ? 'ordered' : 'none');

  return `You are Nexa, the AI Sales Assistant for ${brandName} on Instagram.
You reply to DMs on behalf of ${brandName} in their brand voice: ${brandTone}.
Your job: answer questions, qualify interest, negotiate within approved bounds, close the sale${isSaasOrDigital ? ' — or book a demo/meeting call' : ''}, and provide order status / support.
${originNote}
═══════════ BRAND CONTEXT ═══════════
BRAND: ${brandName}
${businessTypeHeader}
BUSINESS CATEGORY: ${brandDoc.businessCategory || 'Not specified'}
WEBSITE: ${brandDoc.website || 'Not provided'}
LOCATION: ${locationStr}
TARGET AUDIENCE: ${targetAudiences}
USP: ${brandDoc.usp || ''}
TONE: ${brandTone}
APPROVED DISCOUNT RANGE: ${minDiscount}% – ${maxDiscount}% (NEVER exceed this without escalating)
PAYMENT OPTIONS AVAILABLE: ${paymentOptionsStr}
${businessContext}
PRODUCTS/CATALOG:
${catalogStr}
${knowledgeBaseStr}
═══════════ CONVERSATION & ORDER STATE ═══════════
CURRENT STAGE: ${convo.stage}
CURRENT ORDER STATUS: ${currentOrderStatus} (possible values: none | ordered | packing | shipping | delivered | cancelled)
ALREADY COLLECTED:
${collectedStr}

═══════════ STAGE RULES (STRICT) ═══════════
1. GREETING: Warm, brief. If you do not know the customer's name yet, you MUST politely ask for their name before proceeding to any other discussion. Ask what they're interested in if unclear. Never jump to price questions.${isSaasOrDigital ? ' For SaaS: after understanding their interest, proactively offer a free demo call — e.g. "Would you like to hop on a quick 15-min demo call so I can show you exactly how it works? 🚀"' : ''}
2. QUALIFYING: Identify the specific product/service. Use ONLY catalog info — never invent prices, specs, or stock. Trust the catalog completely: if a price is very low (e.g., ₹5), quote it exactly as listed and DO NOT assume or say it is an error.${isSaasOrDigital ? ' For SaaS: ask about their team size, current tool/problem, and use-case to qualify properly.' : ''}
3. NEGOTIATING: Offer discounts ONLY within ${minDiscount}%–${maxDiscount}%. If pushed beyond, say "let me check with the team" and set escalate_to_human=true.
${collectingDetailsRule}
${confirmingRule}
7. SCREENSHOT VERIFICATION: If the user uploads an image while in CONFIRMING or CLOSED stage waiting for payment, analyze it. If it is a valid payment screenshot showing a successful transaction to our UPI, set payment_verified_from_screenshot=true. If it is NOT a valid payment screenshot, politely tell the customer "This doesn't look like a valid payment screenshot. Please provide a clear screenshot showing the payment." and remain in the same stage. CRITICAL: If the user claims they paid but DID NOT upload an image, you MUST say "Please upload a screenshot of your payment so I can verify it." and DO NOT confirm the order and DO NOT set payment_verified_from_screenshot=true.
${closedRule}
9. ESCALATION (HUMAN REQUEST): If the customer explicitly asks to talk to a human or agent, acknowledge this, say "Our team will connect with you shortly," set escalate_to_human=true, and set new_stage="ESCALATED".

═══════════ ORDER TRACKING & CANCELLATION RULES ═══════════
A. ORDER STATUS / TRACKING INQUIRIES:
If the customer asks about their order status, tracking, or delivery progress (e.g., "where is my order?", "has it shipped?", "track order"):
- Check CURRENT ORDER STATUS (${currentOrderStatus}):
  - If "ordered": Tell them their order for ${convo.collected?.product_interested || 'their item'} is confirmed and in queue to be packed soon.
  - If "packing": Tell them our team is currently packing their order with care.
  - If "shipping": Tell them their package has shipped / been dispatched and is on its way!
  - If "delivered": Tell them their package is marked as delivered and ask if they received everything okay.
  - If "cancelled": Tell them the order was cancelled.
  - If "none": Politely let them know no active order was found under their chat, and ask how you can help them place one.
- Keep stage as ${convo.stage || 'CLOSED'}.

B. ORDER CANCELLATION REQUESTS:
If the customer asks to cancel their order (e.g., "cancel my order", "I want to cancel", "don't send"):
- If CURRENT ORDER STATUS is "ordered", "packing", or "none" (NOT yet shipped):
  - You CAN cancel it! Set cancel_order=true in your output.
  - Reply politely confirming: "Your order for ${convo.collected?.product_interested || 'your item'} has been cancelled successfully as requested. If you made an online payment, our team will process the refund."
  - Set new_stage="CLOSED".
- If CURRENT ORDER STATUS is "shipping" or "delivered" (ALREADY shipped / dispatched):
  - Do NOT cancel the order.
  - Reply politely: "Your order for ${convo.collected?.product_interested || 'your item'} has already been shipped and is on its way, so it cannot be cancelled at this stage. Once it arrives, you can contact our support team for return / exchange options."
  - If the customer is insistent, set escalate_to_human=true and new_stage="ESCALATED".

═══════════ HARD RULES ═══════════
- NEVER ask for card numbers, CVV, OTPs, or any sensitive payment credentials in DM.
- NEVER write out, guess, or invent a payment link URL. Say "the link is coming in your next message."
- NEVER fabricate stock, delivery timelines, or discounts not listed above.
- Keep messages EXTREMELY short and concise. Use bullet points instead of long paragraphs. IMPORTANT: When listing product/service features or details, ALWAYS leave a full blank line (double spacing) between each bullet point to make it highly readable in Instagram DMs.
- If the customer asks something outside your explicitly provided knowledge (e.g., location, timings, or specific policies not mentioned in the context): DO NOT GUESS OR FABRICATE AN ANSWER. You MUST set escalate_to_human=true and new_stage="ESCALATED".
- NEVER set payment_link_requested=true unless price_agreed is already finalized and > 0. If they ask to pay before agreeing on an order, politely ask them what they want to order first.
- AD DISPUTE RULE: If a customer mentions seeing a different price in an advertisement, politely inform them that the ad might be outdated or for a different variant, and strictly enforce the current catalog price. DO NOT escalate just because they mention an ad.
- PRODUCT IMAGES: If you are confirming a product order, or if the user asks to see a product, and the product in the catalog has an \`imageBase64\` URL, set \`product_image_url_to_send\` to that URL. Otherwise set it to null.

═══════════ OUTPUT FORMAT ═══════════
Respond ONLY with valid JSON (no markdown, no backticks):
{
  "reply_text": "your message to the customer",
  "new_stage": "one of: GREETING|QUALIFYING|NEGOTIATING|COLLECTING_DETAILS|CONFIRMING|CLOSED|ESCALATED",
  "updated_collected_fields": {},
  "payment_link_requested": false,
  "demo_booking_requested": false,
  "cancel_order": false,
  "escalate_to_human": false,
  "send_upi_qr": false,
  "payment_verified_from_screenshot": false,
  "product_image_url_to_send": null
}`;
};

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handleIncomingMessage = async ({ convo, incomingText, imageUrl, brandDoc, nexaSettings, sendStandardMessage, pageToken, pageId }) => {
  // 0. Circuit Breaker: Prevent infinite bot loops
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentUserMessages = (convo.conversation_history || []).filter(h => h.role === 'user' && new Date(h.ts) > tenMinsAgo);
  
  if (recentUserMessages.length >= 40) {
    // console.log(`[Nexa Circuit Breaker] Triggered for ${convo.ig_user_id}. Too many messages in 10 mins.`);
    await NexaConversation.updateOne({ _id: convo._id }, { stage: 'ESCALATED', escalate_to_human: true });
    return {
      replyText: "I'm pausing our chat for now as we've exchanged many messages quickly. A human agent will connect with you shortly! 🙏",
      newStage: 'ESCALATED',
      paymentLinkRequested: false,
      escalate: true,
      sendUpiQr: false,
      mergedCollected: convo.collected,
    };
  }

  // 1. Build prompt
  const systemPrompt = buildSystemPrompt(brandDoc, convo, nexaSettings);

  // 2. Build history contents for Gemini (alternating user/model turns)
  const contents = [];

  if (convo.conversation_history && convo.conversation_history.length > 0) {
    const historyLimit = convo.conversation_history.slice(-10); // last 10 messages for memory
    for (const h of historyLimit) {
      const role = h.role === 'user' ? 'user' : 'model';
      const text = h.text || '';
      if (!text.trim()) continue;
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }
  }

  // Ensure history starts with user turn
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  // Build the current user turn parts (text + optional image)
  const currentParts = [];
  if (incomingText && incomingText.trim()) {
    currentParts.push({ text: incomingText.trim() });
  }
  if (imageUrl) {
    try {
      if (imageUrl.startsWith('data:')) {
        const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          currentParts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      } else {
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const arrayBuf = await imgRes.arrayBuffer();
          currentParts.push({
            inlineData: {
              mimeType: imgRes.headers.get('content-type') || 'image/jpeg',
              data: Buffer.from(arrayBuf).toString('base64')
            }
          });
        }
      }
    } catch (imgErr) {
      console.warn('[Nexa] Could not fetch image for Gemini:', imgErr.message);
    }
  }

  if (currentParts.length === 0) {
    currentParts.push({ text: ' ' });
  }

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push(...currentParts);
  } else {
    contents.push({ role: 'user', parts: currentParts });
  }

  // 3. Call Gemini 2.5 Flash
  let parsed;
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
      },
    });

    const completion = await model.generateContent({ contents });
    const raw = completion.response.text() || '{}';
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error('[Nexa] Gemini call or JSON parse failed:', err.message);
    parsed = {
      reply_text: "Hey! I'm having a small hiccup — our team will follow up with you shortly 😊",
      new_stage: convo.stage,
      updated_collected_fields: {},
      payment_link_requested: false,
      escalate_to_human: false,
      product_image_url_to_send: null,
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
    if (parsed.updated_collected_fields.payment_mode) {
      parsed.updated_collected_fields.payment_mode = String(parsed.updated_collected_fields.payment_mode).toLowerCase();
    }
    Object.assign(mergedCollected, parsed.updated_collected_fields);
  }

  let paymentUpdate = {};

  // If a payment mode was selected but status is not_generated, set it to pending
  if (mergedCollected.payment_mode && (!convo.payment?.payment_status || convo.payment.payment_status === 'not_generated')) {
    paymentUpdate['payment.payment_status'] = 'pending';
    paymentUpdate['payment.provider'] = mergedCollected.payment_mode;
  }

  // FORCE RULE: Cannot request payment link if price is not finalized
  if (parsed.payment_link_requested && (!mergedCollected.price_agreed || mergedCollected.price_agreed <= 0)) {
    parsed.payment_link_requested = false;
    parsed.reply_text = "Before I send the payment link, could you please confirm exactly what you'd like to order so I can finalize the price?";
    parsed.new_stage = 'QUALIFYING';
  }

  // FORCE RULE: Only send payment links in the CONFIRMING or CLOSED stage
  if (parsed.payment_link_requested && !['CONFIRMING', 'CLOSED'].includes(finalStage)) {
    parsed.payment_link_requested = false;
  }

  // If the agent decided to start a new inquiry from a CLOSED state, wipe old order data
  if (convo.stage === 'CLOSED' && ['GREETING', 'QUALIFYING'].includes(finalStage)) {
    mergedCollected.product_interested = null;
    mergedCollected.price_agreed = null;
    mergedCollected.quantity = null;
    mergedCollected.payment_mode = null;
  }

  // Handle successful screenshot verification
  if (parsed.payment_verified_from_screenshot && ['CONFIRMING', 'CLOSED'].includes(convo.stage)) {
    paymentUpdate['payment.payment_status'] = 'paid';
    paymentUpdate['payment.amount_paise'] = (mergedCollected.price_agreed || 0) * 100;
    paymentUpdate['payment.paid_at'] = new Date();
    
    // Automatically transition to CLOSED if not already there
    if (finalStage !== 'CLOSED') {
      parsed.new_stage = 'CLOSED';
    }

    // Trigger dashboard notification asynchronously
    try {
      import('../utils/notificationHelper.js').then(({ createNotification }) => {
        createNotification(
          brandDoc.user,
          'success',
          '💰 Nexa: Order Paid (Screenshot Verified)',
          `${mergedCollected?.customer_name || 'A customer'} just paid for ${mergedCollected?.product_interested || 'an order'} via UPI/Bank transfer ✅ ` +
          `Amount: ₹${mergedCollected?.price_agreed || '?'} | Address: ${mergedCollected?.delivery_address || 'N/A'}`
        );
      });
    } catch (e) {
      console.error('[Nexa] Failed to send screenshot verification notification', e);
    }
  }

  // 5. Update conversation in DB
  const safeText = (incomingText && String(incomingText).trim() !== '') ? incomingText : '[Attachment/Unsupported Message]';
  const newHistoryEntry = { role: 'user', text: safeText, ts: new Date() };
  const nexaHistoryEntry = { role: 'nexa', text: parsed.reply_text || '[No Reply]', ts: new Date() };

  const newStage = parsed.escalate_to_human ? 'ESCALATED' : (parsed.payment_verified_from_screenshot ? 'CLOSED' : finalStage);

  // Handle order status lifecycle & cancellation
  const isSaasOrDigital = checkIsSaasBrand(brandDoc);
  const isSaasOrDemoLead = isSaasOrDigital || parsed.demo_booking_requested || !!mergedCollected.meeting_time || !!mergedCollected.company_name || (!mergedCollected.delivery_address && !!mergedCollected.email);

  let orderStatusUpdate = {};
  if (parsed.cancel_order || parsed.updated_collected_fields?.order_status === 'cancelled') {
    if (['none', 'ordered', 'packing', 'demo_booked', 'meeting_scheduled', 'lead_captured'].includes(convo.order_status || 'none')) {
      orderStatusUpdate.order_status = 'cancelled';
    }
  } else if (newStage === 'CLOSED' || parsed.payment_verified_from_screenshot || mergedCollected.payment_mode === 'cod') {
    if (!convo.order_status || convo.order_status === 'none') {
      if (parsed.demo_booking_requested || (isSaasOrDemoLead && !mergedCollected.payment_mode)) {
        orderStatusUpdate.order_status = 'demo_booked';
        if (!mergedCollected.lead_type) mergedCollected.lead_type = 'saas_demo';
      } else {
        orderStatusUpdate.order_status = 'ordered';
        if (!mergedCollected.lead_type) mergedCollected.lead_type = 'ecommerce';
      }
    }
  }

  // ─── PUSH NOTIFICATIONS TO DRAWER ───────────────────────────────────────────
  try {
    const { createNotification } = await import('../utils/notificationHelper.js');
    const customer = mergedCollected?.customer_name || convo.ig_user_id || 'A customer';

    // 1. Human Escalation Notification
    if (parsed.escalate_to_human && !convo.escalate_to_human) {
      createNotification(
        brandDoc.user,
        'alert',
        '⚠️ Nexa: Human Reply Required',
        `${customer} asked a question or requested a human agent. Tap to view and reply in Nexa CRM.`,
        { conversationId: convo._id, platform: convo.platform, ig_user_id: convo.ig_user_id, action: 'human_escalation' }
      ).catch(() => {});
    }

    // 2. Order Cancellation Notification
    if (orderStatusUpdate.order_status === 'cancelled' && convo.order_status !== 'cancelled') {
      const product = mergedCollected?.product_interested || 'their order';
      createNotification(
        brandDoc.user,
        'alert',
        '❌ Nexa: Order Cancelled',
        `${customer} cancelled their order for ${product}. Status marked as Cancelled.`,
        { conversationId: convo._id, platform: convo.platform, ig_user_id: convo.ig_user_id, action: 'order_cancelled' }
      ).catch(() => {});
    }

    // 3. New COD Order Notification
    if (mergedCollected.payment_mode === 'cod' && convo.collected?.payment_mode !== 'cod') {
      const product = mergedCollected?.product_interested || 'an order';
      createNotification(
        brandDoc.user,
        'success',
        '📦 Nexa: New COD Order Placed!',
        `${customer} placed a Cash on Delivery order for ${product} (₹${mergedCollected?.price_agreed || 0}). View in Nexa CRM.`,
        { conversationId: convo._id, platform: convo.platform, ig_user_id: convo.ig_user_id, action: 'order_placed' }
      ).catch(() => {});
    }

    // 4. Lead Captured / Demo Requested Notification
    const isNewContact = (!convo.collected?.email && mergedCollected?.email) || (!convo.collected?.phone_number && mergedCollected?.phone_number);
    if (parsed.demo_booking_requested || (isNewContact && mergedCollected?.email)) {
      const email = mergedCollected?.email || 'N/A';
      const phone = mergedCollected?.phone_number || 'N/A';
      const company = mergedCollected?.company_name ? ` at ${mergedCollected.company_name}` : '';
      createNotification(
        brandDoc.user,
        'insight',
        parsed.demo_booking_requested ? '🎯 Nexa: Demo / Meeting Requested' : '👤 Nexa: New Lead Captured',
        `${customer}${company} shared contact details (${email} | ${phone}). View lead in Nexa CRM.`,
        { conversationId: convo._id, platform: convo.platform, ig_user_id: convo.ig_user_id, action: 'lead_captured' }
      ).catch(() => {});
    }
  } catch (notifErr) {
    console.error('[Nexa] Failed to trigger notifications:', notifErr.message);
  }

  // If the conversation was already CLOSED (e.g. order completed) but the AI decides to transition to a new active stage 
  // (because the customer wants to buy something else within the 30-min window), we should FORK a new conversation 
  // so we don't overwrite the old completed order in the CRM!
  if (convo.stage === 'CLOSED' && newStage !== 'CLOSED' && newStage !== 'ESCALATED') {
    const newConvo = await NexaConversation.create({
      user: convo.user,
      brand_id: convo.brand_id,
      ig_user_id: convo.ig_user_id,
      stage: newStage,
      origin: convo.origin,
      nudge_sent: false,
      product_catalog_snapshot: convo.product_catalog_snapshot,
      conversation_history: [...(convo.conversation_history || []), newHistoryEntry, nexaHistoryEntry].slice(-100),
      collected: mergedCollected,
      payment: {},
      order_status: orderStatusUpdate.order_status || 'none',
      escalate_to_human: !!parsed.escalate_to_human,
    });
    // console.log(`[Nexa] Forked new conversation ${newConvo._id} because customer wanted a new order from CLOSED stage.`);
  } else {
    const updateData = {
      $set: {
        stage: newStage,
        collected: mergedCollected,
        escalate_to_human: !!parsed.escalate_to_human,
        ...paymentUpdate,
        ...orderStatusUpdate,
      },
      $push: {
        conversation_history: {
          $each: [newHistoryEntry, nexaHistoryEntry],
          $slice: -100, // cap at last 100 messages to prevent unbounded growth
        },
      },
    };
    await NexaConversation.updateOne({ _id: convo._id }, updateData);
  }

  return {
    replyText: parsed.reply_text,
    newStage: newStage,
    paymentLinkRequested: !!parsed.payment_link_requested,
    demoBookingRequested: !!parsed.demo_booking_requested,
    escalate: !!parsed.escalate_to_human,
    sendUpiQr: !!parsed.send_upi_qr,
    productImageUrlToSend: parsed.product_image_url_to_send || null,
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
    productCatalog = await Product.find({ user: brandDoc.user }).select('name price offerPrice keyBenefit description imageBase64').lean();
  } catch (e) {
    console.error('[Nexa] Failed to fetch products for catalog snapshot:', e.message);
  }

  // Check if conversation already exists
  let doc = await NexaConversation.findOne({ brand_id: brandDoc._id, ig_user_id: igUserId });

  if (doc) {
    if (['ESCALATED'].includes(doc.stage)) {
      // Re-open conversation
      doc.stage = 'AWAITING_FOLLOWUP';
      doc.origin = 'comment_trigger';
      doc.dm_flow_id = dmFlowId || null;
      doc.nudge_due_at = nudgeDueAt;
      doc.nudge_sent = false;
      doc.product_catalog_snapshot = productCatalog;

      // Reset order-specific fields, but KEEP name, phone, delivery_address
      if (!doc.collected) doc.collected = {};
      doc.collected.product_interested = productInterested || null;
      doc.collected.price_agreed = priceAgreed || null;
      doc.collected.quantity = null;
      doc.collected.payment_mode = null;

      if (!doc.payment) doc.payment = {};
      doc.payment.payment_status = 'not_generated';
      doc.payment.provider = null;
      doc.payment.amount_paise = null;

      doc.escalate_to_human = false;
      await doc.save();
      // console.log(`[Nexa] Re-opened conversation ${doc._id} for IG user ${igUserId} from comment`);
    } else {
      // Just update product catalog and nudge if it's still active
      doc.product_catalog_snapshot = productCatalog;
      doc.nudge_due_at = nudgeDueAt;
      await doc.save();
    }
  } else {
    // Create new conversation
    doc = await NexaConversation.create({
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
    });
    // console.log(`[Nexa] Conversation ${doc._id} created for IG user ${igUserId}`);
  }

  return doc;
};

// ─── Create or retrieve conversation from a direct DM ────────────────────────
export const upsertNexaConversationFromDM = async ({
  brandDoc,
  igUserId,
  platform = 'instagram',
}) => {
  // Fetch live product catalog for the brand
  let productCatalog = [];
  try {
    productCatalog = await Product.find({ user: brandDoc.user }).select('name price offerPrice keyBenefit description imageBase64').lean();
  } catch (e) {
    console.error('[Nexa] Failed to fetch products for catalog snapshot:', e.message);
  }

  let doc = await NexaConversation.findOne({ brand_id: brandDoc._id, ig_user_id: igUserId, platform }).sort({ updatedAt: -1 });

  if (doc) {
    const timeSinceLastUpdate = Date.now() - new Date(doc.updatedAt).getTime();
    if (doc.stage === 'CLOSED' && timeSinceLastUpdate > 30 * 60 * 1000) {
      // It's been > 30 minutes since the CLOSED conversation was active. Create a new one!
      doc = await NexaConversation.create({
        user: brandDoc.user,
        brand_id: brandDoc._id,
        ig_user_id: igUserId,
        platform,
        stage: 'GREETING',
        origin: 'direct_dm',
        nudge_sent: false,
        product_catalog_snapshot: productCatalog,
        conversation_history: [],
      });
      // console.log(`[Nexa] Conversation ${doc._id} created from direct DM (previous was CLOSED and stale) for IG user ${igUserId}`);
    } else if (['ESCALATED'].includes(doc.stage)) {
      // Re-open conversation
      doc.stage = 'GREETING';
      doc.origin = 'direct_dm';
      doc.nudge_sent = false;
      doc.product_catalog_snapshot = productCatalog;

      // Reset order-specific fields, but KEEP name, phone, delivery_address
      if (!doc.collected) doc.collected = {};
      doc.collected.product_interested = null;
      doc.collected.price_agreed = null;
      doc.collected.quantity = null;
      doc.collected.payment_mode = null;

      if (!doc.payment) doc.payment = {};
      doc.payment.payment_status = 'not_generated';
      doc.payment.provider = null;
      doc.payment.amount_paise = null;

      doc.escalate_to_human = false;
      await doc.save();
      // console.log(`[Nexa] Re-opened conversation ${doc._id} from direct DM for IG user ${igUserId}`);
    } else {
      doc.product_catalog_snapshot = productCatalog;
      await doc.save();
    }
  } else {
    doc = await NexaConversation.create({
      user: brandDoc.user,
      brand_id: brandDoc._id,
      ig_user_id: igUserId,
      platform,
      stage: 'GREETING',
      origin: 'direct_dm',
      nudge_sent: false,
      product_catalog_snapshot: productCatalog,
      conversation_history: [],
    });
    // console.log(`[Nexa] Conversation ${doc._id} created from direct DM for IG user ${igUserId}`);
  }

  return doc;
};
