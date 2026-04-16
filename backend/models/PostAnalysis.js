import mongoose from 'mongoose';

const postAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaUrl: {
    type: String, // Local path or Cloudinary URL
    required: true
  },
  contentType: {
    type: String,
    enum: ['reel', 'static', 'carousel'],
    required: true
  },
  description: String,
  growthFactor: {
    type: Number,
    default: 0
  },
  analysis: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    seoKeywords: [String]
  },
  predictedEngagement: Number,
  bestPostingTime: Date,
  isScheduled: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['analyzed', 'scheduled', 'published', 'failed'],
    default: 'analyzed'
  },
  embedding: {
    type: [Number], // For Vector Search (Length will match Gemini text-embedding-004)
    index: false // We define the vector index in Atlas
  }
}, { timestamps: true, collection: 'post_analyses' });

export default mongoose.model('PostAnalysis', postAnalysisSchema);
