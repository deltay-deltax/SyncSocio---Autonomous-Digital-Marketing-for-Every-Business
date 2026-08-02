import mongoose from 'mongoose';

const requestedTemplateSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrandProfile',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION']
  },
  language: {
    type: String,
    required: true,
    default: 'en'
  },
  headerType: {
    type: String,
    enum: ['NONE', 'TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO'],
    default: 'NONE'
  },
  headerContent: {
    type: String,
    default: ''
  },
  bodyContent: {
    type: String,
    required: true
  },
  footerContent: {
    type: String,
    default: ''
  },
  buttons: [{
    type: {
      type: String,
      enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'],
      required: true
    },
    text: {
      type: String,
      required: true
    },
    url: String,
    phoneNumber: String
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  metaTemplateId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const RequestedTemplate = mongoose.model('RequestedTemplate', requestedTemplateSchema);
export default RequestedTemplate;
