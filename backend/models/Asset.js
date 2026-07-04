import mongoose from 'mongoose';
import crypto from 'crypto';

const assetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
    index: true,
  },
  slug: {
    type: String,
    required: true,
    index: true,
  },
  // AI-generated content
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  heroImageUrl: {
    type: String,
    default: '',
  },
  ctaText: {
    type: String,
    default: 'Learn More',
  },
  ctaUrl: {
    type: String,
    default: '',
  },
  // Metadata for social previews (OpenGraph)
  ogTitle: String,
  ogDescription: String,
  ogImage: String,

  // Branding
  brandName: String,
  brandColor: {
    type: String,
    default: '#2563EB',
  },
  brandSecondaryColor: {
    type: String,
    default: '#60A5FA',
  },

  // Context
  linkedFlowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DMFlow',
  },
  linkedPostTopic: String,

  // Sections (AI-generated rich content blocks)
  sections: [{
    type: { type: String, enum: ['text', 'features', 'testimonial', 'pricing', 'faq'], default: 'text' },
    heading: String,
    body: String,
    items: [{ icon: String, title: String, description: String }],
  }],

  isPublished: {
    type: Boolean,
    default: false,
  },

  stats: {
    views: { type: Number, default: 0 },
    ctaClicks: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

// Compound unique index: one slug per username
assetSchema.index({ username: 1, slug: 1 }, { unique: true });

// Static helper to generate a unique slug
assetSchema.statics.generateSlug = function (topicHint = '') {
  const base = topicHint
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'asset';
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
};

export default mongoose.model('Asset', assetSchema);
