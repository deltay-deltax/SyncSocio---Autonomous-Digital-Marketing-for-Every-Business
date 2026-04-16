import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  day: String,
  topic: String,
  format: String
});

const contentCalendarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  posts: [postSchema],
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
