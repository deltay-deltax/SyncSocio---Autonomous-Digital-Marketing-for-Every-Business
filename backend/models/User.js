import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false // Optional, because OAuth users don't have passwords
  },
  googleId: {
    type: String,
    required: false
  },
  appleId: {
    type: String,
    required: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

export default mongoose.model('User', userSchema);
