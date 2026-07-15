import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  website: {
    type: String,
    required: false,
    trim: true,
  },
  businessCategory: {
    type: String,
    required: true,
  },
  intent: {
    type: String,
    required: false,
    default: 'other',
  },
  status: {
    type: String,
    enum: ['green', 'yellow', 'red', 'new'],
    default: 'new',
  },
  comments: {
    type: String,
    default: '',
  },
  source: {
    type: String,
    enum: ['website', 'manual'],
    default: 'website',
  },
}, { timestamps: true });

export default mongoose.model('Lead', leadSchema);
