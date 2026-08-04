# Nexa — Instagram DM Lead-Capture & Closing Agent
### 2-Day Build Plan + Drop-In Prompt

---

## 0. What this fits into

You already have `dm_flow_agent.py` — it currently *decides* whether a post needs DM automation. Nexa is the next layer: the agent that actually **runs** the DM conversation once someone messages in, from first "hi" through to a closed order.

This plan assumes: Meta permissions are approved (`instagram_manage_messages`, `pages_messaging`), you have a webhook receiver already stood up (per your May 2026 webhook work), and MongoDB for state storage.

---

## 1. Architecture (high level)

```
Instagram DM → Meta Webhook → Your Backend
                                   │
                                   ▼
                        Conversation State Loader
                        (MongoDB: one doc per IG user+brand)
                                   │
                                   ▼
                          Nexa Agent (Claude/Anthropic SDK)
                    [system prompt + brand DNA + product catalog
                     + conversation history + current slot-fill state]
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                            ▼
              Reply to user via              Update state doc
              Instagram Send API              (stage + collected fields)
                                                   │
                                    If new_stage == CONFIRMING and 
                                    price_agreed is set:
                                                   ▼
                                     Call generatePaymentLink()
                                     using THIS BRAND'S OWN Razorpay keys
                                     (never SyncSocio's account — see §3.5)
                                                   │
                                                   ▼
                                     Append link to Nexa's next reply
                                     Stage → CLOSED only after link is sent
                                                   │
                                          Razorpay webhook (payment_link.paid)
                                                   ▼
                                     Decrement real stock_quantity
                                     Notify brand owner: "Order paid ✅"
```

**Important distinction:** Nexa never talks to Razorpay directly. Nexa's only job is to decide *when* a payment link is needed (i.e., when it reaches CONFIRMING with a price agreed) and to say so in its structured output. Your backend code — not the model — calls the Razorpay API, gets the real `short_url`, and inserts it into the message before sending. This keeps Razorpay credentials, and the actual money-moving step, entirely outside the LLM's hands.

**Core design decision:** Nexa should NOT be one giant "figure it out" prompt (same lesson as your image-gen problem). It needs an explicit **state machine** — a `stage` field per conversation — so the model always knows exactly what's been collected and what's still needed, rather than re-deciding the whole conversation from scratch every turn.

---

## 2. Conversation State Schema (MongoDB)

```javascript
{
  _id: ObjectId,
  brand_id: ObjectId,              // which client this is
  ig_user_id: "17841...",          // Instagram-scoped user id (not exposed to model directly)
  stage: "GREETING",               // GREETING | QUALIFYING | NEGOTIATING | COLLECTING_DETAILS | CONFIRMING | CLOSED | ESCALATED
  collected: {
    customer_name: null,
    product_interested: null,
    price_agreed: null,
    quantity: null,
    delivery_address: null,
    phone_number: null,
    payment_mode: null,            // "payment_link" | "cod" — see §3.5
  },
  payment: {
    razorpay_link_id: null,        // e.g. "plink_abc123" — Razorpay's own ID, for lookups
    razorpay_short_url: null,      // the actual link sent to the customer
    link_generated_at: null,
    payment_status: "not_generated", // not_generated | pending | paid | expired
    amount_paise: null,            // Razorpay works in paise, not rupees — store it that way to avoid rounding bugs
    paid_at: null
  },
  conversation_history: [
    { role: "user", text: "hi, how much is this?", ts: ... },
    { role: "nexa", text: "...", ts: ... }
  ],
  escalate_to_human: false,
  last_updated: ISODate,
  created_at: ISODate
}
```

Each **brand** (not each conversation) also needs its own Razorpay credentials stored once:

```javascript
// brands collection — one-time setup per brand, in your dashboard
{
  brand_id: ObjectId,
  razorpay_key_id: "rzp_live_...",       // encrypted at rest
  razorpay_key_secret: "...",            // encrypted at rest, never logged, never sent to the model
  razorpay_connected: true,
  cod_enabled: true                      // whether this brand allows Cash on Delivery as a fallback
}
```

**Why a `stage` field matters:** it lets you write simple, deterministic guardrails around the model (e.g. "don't ask for delivery address until stage >= NEGOTIATING and price_agreed is not null") instead of trusting the LLM to remember conversation logic unaided over many turns.

---

## 3. The Nexa System Prompt (drop-in)

This follows your existing prompt architecture style (`common.py` persona wrapper + specific role prompt). Two-part structure: persona + stage-aware instructions.

```text
You are Nexa, the AI Sales Assistant for {brand_name} on Instagram.
You reply to DMs on behalf of {brand_name} in their brand voice: {brand_tone}.
Your job is to answer questions, qualify the customer's interest, negotiate 
within approved bounds, and close the sale — collecting everything needed 
to fulfill the order.

═══════════ BRAND CONTEXT ═══════════
BRAND: {brand_name}
PRODUCTS/CATALOG: {product_catalog_json}
USP: {brand_usp}
TONE: {brand_tone}
APPROVED DISCOUNT RANGE: {min_discount}% – {max_discount}% (NEVER exceed this without escalating)

═══════════ CONVERSATION STATE ═══════════
CURRENT STAGE: {stage}
ALREADY COLLECTED: {collected_json}
FULL HISTORY: {conversation_history}

═══════════ STAGE RULES (STRICT) ═══════════
1. GREETING: Respond warmly, ask what they're interested in if unclear. 
   Never skip ahead to price/order questions unprompted.
2. QUALIFYING: Identify which specific product they want. Answer questions 
   using ONLY the product catalog above — never invent prices, specs, or stock.
3. NEGOTIATING: You may offer discounts ONLY within the approved range. 
   If the customer pushes beyond that range, say you'll "check with the team" 
   and set escalate_to_human = true. Never invent authority you don't have.
4. COLLECTING_DETAILS: Once price is agreed, collect IN THIS ORDER, one at a 
   time (do not ask for everything in one message — it feels like an 
   interrogation and kills conversion):
   a) Customer's name
   b) Exact product + quantity
   c) Confirm final price
   d) Delivery address (full address, not just city)
   e) Phone number (for delivery coordination)
5. CONFIRMING: Read back everything collected in one message. Ask if they'd 
   like to pay now via a secure payment link, or Cash on Delivery (only if 
   {cod_enabled} is true for this brand). 
   - If they choose the payment link: set "payment_link_requested": true in 
     your output and tell them the link is coming in your next message — 
     DO NOT invent, guess, or write out a URL yourself. The real link is 
     inserted by the system after you respond.
   - If they choose COD: set payment_mode = "cod" and move to CLOSED directly.
6. CLOSED: Only enter this stage once either (a) a real payment link has been 
   sent by the system, or (b) COD was confirmed. Thank them and let them know 
   the team will confirm shortly. Do not continue negotiating after this stage.

═══════════ HARD RULES ═══════════
- NEVER ask for card numbers, CVV, OTPs, or any payment credentials in DM.
- NEVER write out, guess, or invent a payment link URL yourself. You may only 
  say a link is being sent — the actual `{razorpay_short_url}` is inserted by 
  the system, not generated by you. If you don't see a real link provided to 
  you in context, do not claim one was sent.
- NEVER fabricate stock availability, delivery timelines, or discounts not 
  explicitly listed above.
- If the customer asks something outside your knowledge (e.g. a complaint, 
  a return, something not in the catalog), set escalate_to_human = true and 
  tell them a team member will follow up — do not guess.
- Keep messages short and native to how people actually text on Instagram — 
  no long paragraphs, no corporate tone.
- Output your reply AND an updated state object in this exact JSON format:

{
  "reply_text": "...",
  "new_stage": "...",
  "updated_collected_fields": { ... only fields that changed ... },
  "payment_link_requested": false,
  "escalate_to_human": false
}
```

**Why `payment_link_requested` is a separate flag from the stage itself:** this is the same principle as stock-checking earlier — the model *asks* for a payment link, but never generates or sees the real URL until your backend calls Razorpay and hands it back. On the turn after `payment_link_requested: true`, your backend fetches the real `short_url`, injects it as a fact into Nexa's next context (e.g. `PAYMENT_LINK_TO_SEND: {short_url}`), and only then does Nexa include it in `reply_text`. Never let the model output a link on the same turn it requests one — there's nothing to insert yet.

---

## 3.5 Razorpay Payment Links — the actual integration

**Whose account:** always the brand's own Razorpay account, never SyncSocio's. If customer payments flowed through your account before reaching brands, you'd be acting as a Payment Aggregator under RBI rules — which requires RBI authorization you don't have. Every brand connects (or types in) their own Key ID + Key Secret; your code always calls Razorpay using *that brand's* credentials.

**One-time setup per brand (dashboard, not code):**
- Add a settings field: Razorpay Key ID + Key Secret. Encrypt at rest (e.g. via your DB's field-level encryption or a KMS) — never log these, never pass them anywhere near the LLM context.
- Ask your 2 current clients today whether they already have a Razorpay merchant account — KYC approval (PAN, bank details, business proof) can take same-day to a few days and is outside your control, so this determines whether the feature ships this week or waits on their approval.

**The actual API call (Node.js, using the `razorpay` npm package):**

```javascript
const Razorpay = require('razorpay');

async function generatePaymentLink({ brandId, amountRupees, customerName, phone, description }) {
  const brand = await db.collection('brands').findOne({ _id: brandId });
  if (!brand?.razorpay_key_id) {
    throw new Error('Brand has not connected Razorpay yet');
  }

  const instance = new Razorpay({
    key_id: decrypt(brand.razorpay_key_id),
    key_secret: decrypt(brand.razorpay_key_secret),
  });

  const link = await instance.paymentLink.create({
    amount: Math.round(amountRupees * 100), // Razorpay expects paise, always round to avoid float errors
    currency: 'INR',
    accept_partial: false,
    description: description || 'Order via Instagram',
    customer: {
      name: customerName,
      contact: phone, // Indian format, e.g. +91XXXXXXXXXX
    },
    notify: { sms: true, email: false },
    callback_url: `${process.env.BASE_URL}/webhooks/razorpay/payment-confirmed`,
    callback_method: 'get',
  });

  return {
    razorpay_link_id: link.id,       // e.g. "plink_..."
    razorpay_short_url: link.short_url, // this is what Nexa sends
  };
}
```

**Webhook — this is what actually confirms payment and decrements stock (never Nexa's "yes"):**

```javascript
// POST /webhooks/razorpay/:brandId  (register this URL in each brand's Razorpay dashboard)
app.post('/webhooks/razorpay/:brandId', async (req, res) => {
  const brand = await db.collection('brands').findOne({ _id: req.params.brandId });
  
  // Verify the webhook signature using THIS brand's secret — never skip this,
  // otherwise anyone could fake a "payment confirmed" call
  const isValid = Razorpay.validateWebhookSignature(
    JSON.stringify(req.body),
    req.headers['x-razorpay-signature'],
    decrypt(brand.razorpay_key_secret)
  );
  if (!isValid) return res.status(400).send('Invalid signature');

  if (req.body.event === 'payment_link.paid') {
    const linkId = req.body.payload.payment_link.entity.id;
    // Find the matching conversation by razorpay_link_id, mark payment_status = "paid",
    // THEN decrement stock_quantity for real (release the earlier soft-reservation),
    // THEN notify the brand owner: "Order paid ✅ — details attached"
  }

  res.status(200).send('ok');
});
```

**QR code vs link:** send the link as plain tappable text, not a QR code. QR codes solve an in-person handoff problem (scan-instead-of-type); inside an Instagram DM the customer is already on their phone in-app, so a tappable link is one tap while a QR adds screenshot/scan/tap steps — friction you're specifically trying to remove.

---

## 4. Day-by-Day Build Plan

### Day 1 — Core loop working end-to-end (text only, no polish)
- [ ] Webhook receiver: confirm incoming DM events are landing (you likely have most of this from your May webhook work — just needs the message-received event, not just page subscription)
- [ ] MongoDB schema above — create collection + basic CRUD
- [ ] Nexa agent call: wire the system prompt above into your existing Anthropic SDK call pattern, injecting brand DNA + product catalog + state
- [ ] Parse the JSON response, update state doc, send `reply_text` back via Instagram Send API
- [ ] Test manually: DM your own test business account through the full flow once, end to end, watching the stage transitions

### Day 2 — Guardrails, payment links, and edge cases
- [ ] Enforce stage-gating in code (not just the prompt) — e.g., don't let the state machine jump from GREETING straight to COLLECTING_DETAILS even if the model tries; validate transitions server-side as a safety net
- [ ] Add Razorpay Key ID/Secret fields to brand settings (encrypted); confirm your 1-2 pilot clients actually have Razorpay accounts before assuming this ships for them immediately
- [ ] Wire `generatePaymentLink()` — call it only when Nexa outputs `payment_link_requested: true`, inject the real `short_url` into the next turn's context, never let the model write its own URL
- [ ] Register and test the Razorpay webhook — this is what actually decrements stock and notifies the owner, not Nexa's stage transition
- [ ] Build the "deal closed" notification — push the completed `collected` object + payment status to the brand owner (simplest: an email or a dashboard row; don't over-build this in 2 days)
- [ ] Escalation path: when `escalate_to_human = true`, stop Nexa from replying further on that thread and flag it somewhere visible
- [ ] Test edge cases:
  - Customer goes silent mid-flow, comes back a day later (state should resume, not restart)
  - Customer asks for a discount way outside range
  - Customer asks something totally unrelated to any product
  - Customer tries to rush straight to "just send me your account number" (should never happen — Nexa should never ask for or accept full payment details)
  - Customer gets a payment link, never pays — link should expire/go stale in your view rather than sit as a phantom "closed" order forever
- [ ] Rate/spam check: make sure Nexa doesn't respond to the same message twice if webhook fires more than once (idempotency key on message ID)

---

## 5. What I'd explicitly NOT build in this 2-day window
- Your own in-house payment processing — always route through the brand's own Razorpay account (§3.5), never build a custom payment flow
- COD logistics/reconciliation tooling — just record `payment_mode: "cod"` and let the owner handle it manually for now
- Multi-language support beyond what your existing content agents already handle
- Voice/audio DM handling
- Analytics dashboard for Nexa performance — log the data, build the dashboard later

---

## 7. Comment-Trigger Flow → Handoff to Nexa

This is the path from your earlier "comment keyword to get DM" work. Right now `dm_flow_agent.py` generates three static messages (Hook, if-not-following gate, if-following delivery) and stops. That's a dead end — nobody carries the conversation past "here's the price" into an actual close. Here's how it connects to Nexa.

### The flow, end to end

```
User comments trigger keyword under a post
              │
              ▼
   Meta webhook: comment.create event
              │
              ▼
   Match against post's stored trigger_keyword
              │
              ▼
   Send PRE-WRITTEN static messages (already generated by dm_flow_agent.py):
   1. Hook ("Hey! Thanks for your interest 👋")
   2. If not following → gate message asking them to follow
   3. Delivery message → the actual price/link/info they asked for
              │
              ▼
   Create conversation state doc:
     stage: "AWAITING_FOLLOWUP"
     origin: "comment_trigger"
     product_interested: <pre-filled, since we already know which post>
     price_agreed: <pre-filled IF delivery message stated a fixed price>
     nudge_due_at: now + 8 minutes   ← scheduled nudge time
              │
              ▼
        Two possible next events, whichever comes FIRST:
              │
   ┌──────────┴──────────┐
   ▼                      ▼
User replies           nudge_due_at arrives
before nudge fires     (no reply yet)
   │                      │
   ▼                      ▼
Cancel scheduled       Nexa sends the nudge itself:
nudge. Route reply     "Want me to help you place
straight into Nexa,     the order? 😊"
skip GREETING           │
(context already        ▼
has product+price)     Route any reply from here
                        into Nexa, same as above
```

### Why the delay, and why 8 minutes isn't arbitrary

Firing "want to place an order?" immediately after the delivery message feels pushy and robotic — like two bots talking at someone back to back. Waiting entirely (never following up) loses warm leads who got distracted mid-scroll. A short delay (5-10 minutes is a reasonable starting point — A/B test it once you have volume) mimics how a real person would follow up: give them a moment to actually read the price, then check back in.

### Scheduling the nudge — simplest reliable approach

You don't need a job queue (BullMQ/Redis) for this at your current scale — a simple polling worker is enough and much less to maintain:

```javascript
// Runs every 1 minute via cron (node-cron, or your existing scheduler)
async function processDueNudges() {
  const due = await db.collection('conversations').find({
    stage: 'AWAITING_FOLLOWUP',
    nudge_due_at: { $lte: new Date() },
    nudge_sent: { $ne: true }
  }).toArray();

  for (const convo of due) {
    // Double-check the user hasn't replied in the meantime (race safety)
    const fresh = await db.collection('conversations').findOne({ _id: convo._id });
    if (fresh.stage !== 'AWAITING_FOLLOWUP') continue; // they already replied, skip

    await sendInstagramMessage(convo.ig_user_id, "Want me to help you place the order? 😊");
    await db.collection('conversations').updateOne(
      { _id: convo._id },
      { $set: { stage: 'QUALIFYING', nudge_sent: true, origin_note: 'nudge_sent' } }
    );
  }
}
```

When the user's actual reply comes in via the normal webhook handler (whether that's before or after the nudge), it should check `origin: "comment_trigger"` and **pre-seed Nexa's context** with what's already known, so it doesn't re-ask the customer something it already told them:

```javascript
if (convo.origin === 'comment_trigger' && convo.product_interested) {
  // Skip straight past GREETING/QUALIFYING — Nexa already knows the product 
  // and possibly the price. Start at NEGOTIATING or COLLECTING_DETAILS 
  // depending on whether the delivery message gave a firm price.
  initialStage = convo.price_agreed ? 'COLLECTING_DETAILS' : 'NEGOTIATING';
}
```

### One Meta policy thing worth checking before you rely on this timing

Instagram's messaging permissions around unprompted follow-ups (sending a message when the user hasn't just messaged you) have specific windows and message-tag rules that Meta updates periodically — don't assume an 8-minute automated nudge is definitely fine long-term without checking your app's current permission scope in Meta's docs. It's very likely fine since you're replying within the same conversation thread shortly after they initiated contact via comment, but this is worth a 10-minute check against Meta's current Messenger Platform policy page before you ship it, not an assumption to bake in blind.

--