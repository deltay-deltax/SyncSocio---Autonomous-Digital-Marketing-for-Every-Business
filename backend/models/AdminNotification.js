import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_user', 'payment', 'failed_gen', 'nexa_escalation', 'ticket_reply', 'template_submitted', 'low_credits', 'system_error', 'whatsapp_connected', 'campaign_sent'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
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

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
export default AdminNotification;
