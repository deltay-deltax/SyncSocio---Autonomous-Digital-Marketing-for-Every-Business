import mongoose from 'mongoose';

const apiLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  provider: {
    type: String,
    enum: ['FAL', 'CLAUDE', 'OPENAI', 'GEMINI', 'OTHER'],
    required: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  costInCents: {
    type: Number,
    default: 0,
  },
  isError: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model('ApiLog', apiLogSchema);
