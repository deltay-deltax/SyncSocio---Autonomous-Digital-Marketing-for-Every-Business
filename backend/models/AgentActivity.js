import mongoose from 'mongoose';

const agentActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agentName: {
    type: String,
    required: true // e.g., 'Engine', 'Strategist', 'Neural Pulse', 'G-Factor'
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'done', 'error'],
    default: 'done'
  },
  duration: {
    type: String // e.g., '4.2s'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for performance on the dashboard
agentActivitySchema.index({ user: 1, timestamp: -1 });

const AgentActivity = mongoose.model('AgentActivity', agentActivitySchema);

export default AgentActivity;
