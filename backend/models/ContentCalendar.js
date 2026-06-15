import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  id: String,
  day: String,
  date: String,
  topic: String,
  format: String,
  type: String,
  title: String,
  scheduledAt: String,
  prompt: String,
  visualPrompt: String,
  detailedDescription: String,
  contentHook: String,
  optimalTime: String,
  why: String,
  carouselSlides: Number,
  slidesMetadata: mongoose.Schema.Types.Mixed,
  generatedVisuals: [String],
  gScore: Number,
  verdict: String,
  productImageIndex: Number
}, { _id: false });

const contentCalendarSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  posts: [postSchema],
  heartedPostIds: {
    type: [String],
    default: []
  },
  captions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['active', 'past', 'paused', 'deployed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true, collection: 'content_calendars' });

export default mongoose.model('ContentCalendar', contentCalendarSchema);
