import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrandProfile',
    index: true,
  },
  // Image stored as base64 string
  imageBase64: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 200,
    default: '',
  },

  price: {
    type: Number,
    default: null,
  },
  offerPrice: {
    type: Number,
    default: null,
  },
  keyBenefit: {
    type: String,
    default: '',
  },
  serviceProvider: {
    type: String,
    default: '',
  },
  // ── AI Ads Creative only ─────────────────────────────────────────────────────
  // Auto-generated forensic visual description of the product packaging.
  // Used exclusively by ad_creative_agent.py as Block 2 (Product appearance).
  // Not used by any other generation mode.
  adVisualDescription: {
    type: String,
    default: '',
  },
  adVisualDescriptionStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed', ''],
    default: '',
  },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
