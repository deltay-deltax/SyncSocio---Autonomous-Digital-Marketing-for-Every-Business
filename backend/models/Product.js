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
  // Image stored as base64 string (deprecated in favor of imageUrls)
  imageBase64: {
    type: String,
    default: '',
  },
  // Up to 3 variant images for the product
  imageUrls: {
    type: [String],
    default: [],
  },
  // Dynamically categorized specifications (e.g., Ingredients, Fit, Fabric)
  specifications: [{
    label: String,
    value: String,
  }],
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 2000,
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
  // Compact, verified facts used by the AI Ads Director. These fields are
  // intentionally bounded so product scraping stays inexpensive and prompts
  // do not grow with full product-page content.
  verifiedBenefits: {
    type: [String],
    default: [],
  },
  proofPoints: {
    type: [String],
    default: [],
  },
  offerDetails: {
    type: String,
    maxlength: 500,
    default: '',
  },
  guarantee: {
    type: String,
    maxlength: 500,
    default: '',
  },
  variantDetails: {
    type: [String],
    default: [],
  },
  sourceUrl: {
    type: String,
    maxlength: 500,
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
  adVisualDescriptionSecondary: {
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
