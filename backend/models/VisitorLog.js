import mongoose from 'mongoose';

const visitorLogSchema = new mongoose.Schema({
  ipAddress: { type: String, default: 'Unknown' },
  userAgent: { type: String, default: 'Unknown' },
  path: { type: String, default: '/' },
  sessionToken: { type: String, default: 'unknown-session' },
  createdAt: { type: Date, default: Date.now }
});

const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema);

export default VisitorLog;
