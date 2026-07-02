import mongoose from 'mongoose';

const metaTesterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandProfile',
      required: false,
    },
    igHandle: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    }
  },
  { timestamps: true }
);

const MetaTester = mongoose.model('MetaTester', metaTesterSchema);

export default MetaTester;
