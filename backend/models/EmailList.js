import mongoose from 'mongoose';

const emailListSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  emails: [{
    type: String,
    required: true
  }]
}, { timestamps: true });

export default mongoose.model('EmailList', emailListSchema);
