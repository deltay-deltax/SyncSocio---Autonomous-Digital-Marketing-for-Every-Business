import mongoose from 'mongoose';

const phoneListSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phones: [{
    type: String,
    required: true
  }]
}, { timestamps: true });

export default mongoose.model('PhoneList', phoneListSchema);
