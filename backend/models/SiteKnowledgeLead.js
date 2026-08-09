import mongoose from 'mongoose';

const siteKnowledgeLeadSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'answered', 'ignored'],
    default: 'pending',
  },
  askedAt: {
    type: Date,
    default: Date.now,
  },
  answeredAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

export default mongoose.model('SiteKnowledgeLead', siteKnowledgeLeadSchema);
