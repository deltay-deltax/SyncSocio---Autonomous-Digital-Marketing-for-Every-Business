import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['success', 'insight', 'agent', 'comment', 'scheduled', 'alert', 'billing'],
    default: 'agent'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
