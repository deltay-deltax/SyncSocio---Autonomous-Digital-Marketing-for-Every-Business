import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
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
    required: true,
    enum: ['creatives', 'demo'],
  },
}, { timestamps: true });

export default mongoose.model('Lead', leadSchema);
