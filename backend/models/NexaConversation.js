import mongoose from 'mongoose';

const conversationHistorySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'nexa'], required: true },
    text: { type: String, required: true },
    ts:   { type: Date, default: Date.now },
  },
  { _id: false }
);

const nexaConversationSchema = new mongoose.Schema(
  {
    brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandProfile', required: true, index: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ig_user_id: { type: String, required: true, trim: true, index: true },

    // State machine
    stage: {
      type: String,
      enum: ['AWAITING_FOLLOWUP','GREETING','QUALIFYING','NEGOTIATING','COLLECTING_DETAILS','CONFIRMING','CLOSED','ESCALATED'],
      default: 'AWAITING_FOLLOWUP',
    },
    origin: { type: String, enum: ['comment_trigger', 'direct_dm'], default: 'comment_trigger' },

    // Slot-fill state
    collected: {
      customer_name:      { type: String, default: null },
      product_interested: { type: String, default: null },
      price_agreed:       { type: Number, default: null },
      quantity:           { type: Number, default: null },
      delivery_address:   { type: String, default: null },
      phone_number:       { type: String, default: null },
      payment_mode:       { type: String, enum: ['razorpay','upi','bank_transfer','cod', null], default: null },
    },

    // Payment state
    payment: {
      provider:           { type: String, enum: ['razorpay','upi','bank_transfer','cod', null], default: null },
      razorpay_link_id:   { type: String, default: null },
      razorpay_short_url: { type: String, default: null },
      upi_id:             { type: String, default: null },
      bank_details:       { type: String, default: null },
      link_generated_at:  { type: Date, default: null },
      payment_status: { type: String, enum: ['not_generated','pending','paid','expired'], default: 'not_generated' },
      amount_paise:       { type: Number, default: null },
      paid_at:            { type: Date, default: null },
    },

    conversation_history: { type: [conversationHistorySchema], default: [] },
    escalate_to_human:    { type: Boolean, default: false },

    // Nudge scheduling
    nudge_due_at: { type: Date, default: null },
    nudge_sent:   { type: Boolean, default: false },

    // Context snapshot
    product_catalog_snapshot: { type: Array, default: [] },
    dm_flow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'DMFlow', default: null },
  },
  { timestamps: true, collection: 'nexa_conversations' }
);

nexaConversationSchema.index({ brand_id: 1, ig_user_id: 1 }, { unique: true });
nexaConversationSchema.index({ user: 1, stage: 1, nudge_due_at: 1, nudge_sent: 1 });

export default mongoose.model('NexaConversation', nexaConversationSchema);
