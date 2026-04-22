import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  day: String,
  date: String,
  topic: String,
  format: String,
  type: String,
  prompt: String,
  optimalTime: String,
  why: String
}, { _id: false });

const contentCalendarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  posts: [postSchema],
  captions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['active', 'past', 'paused'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true, collection: 'content_calendars' });

export default mongoose.model('ContentCalendar', contentCalendarSchema);
