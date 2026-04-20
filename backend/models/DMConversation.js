import mongoose from 'mongoose';

const DMConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderId: {
    type: String, // IGSID of the person messaging the brand
    required: true,
  },
  lastDefaultReplyAt: {
    type: Date,
  },
}, { timestamps: true });

// Ensure we can quickly find a conversation for a specific sender
DMConversationSchema.index({ user: 1, senderId: 1 }, { unique: true });

export default mongoose.model('DMConversation', DMConversationSchema);
