import mongoose from 'mongoose';

export const FLOW_TRIGGERS = ['comment', 'story_reply', 'dm_keyword'];
export const FLOW_TARGET_TYPES = ['all', 'specific'];
export const FLOW_BUTTON_TYPES = ['url', 'next', 'follow', 'visit_profile'];
export const FLOW_CONDITIONS = ['if_following', 'if_not_following'];

export const normalizeKeywordInput = (input = '') => {
  if (typeof input !== 'string') return '';
  return input.normalize('NFKC').trim().toLowerCase();
};

export const isExactKeywordMatch = (configuredKeyword, incomingText) => {
  const normalizedConfigured = normalizeKeywordInput(configuredKeyword);
  if (!normalizedConfigured) return false;
  return normalizedConfigured === normalizeKeywordInput(incomingText);
};

const flowButtonSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    type: {
      type: String,
      enum: FLOW_BUTTON_TYPES,
      required: true,
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

flowButtonSchema.path('url').validate(function validateButtonUrl(url) {
  if (this.type === 'url' || this.type === 'visit_profile') {
    return typeof url === 'string' && url.trim().length > 0;
  }
  return true;
}, 'A URL is required for url and visit_profile button types.');

const flowMessageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    buttons: {
      type: [flowButtonSchema],
      default: [],
      validate: {
        validator: (buttons) => Array.isArray(buttons) && buttons.length <= 3,
        message: 'Each message can have up to 3 buttons.',
      },
    },
    conditional: {
      type: String,
      default: null,
      validate: {
        validator: (value) => value === null || FLOW_CONDITIONS.includes(value),
        message: 'Invalid conditional value for message.',
      },
    },
  },
  { _id: false }
);

const dmFlowSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    trigger: {
      type: String,
      enum: FLOW_TRIGGERS,
      required: true,
    },
    targetType: {
      type: String,
      enum: FLOW_TARGET_TYPES,
      required: true,
    },
    targetMediaId: {
      type: String,
      trim: true,
      default: '',
    },
    keyword: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    keywordNormalized: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    messages: {
      type: [flowMessageSchema],
      required: true,
      validate: {
        validator: (messages) => Array.isArray(messages) && messages.length > 0,
        message: 'At least one message is required in a DM flow.',
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    stats: {
      triggered: {
        type: Number,
        default: 0,
        min: 0,
      },
      replied: {
        type: Number,
        default: 0,
        min: 0,
      },
      clicked: {
        type: Number,
        default: 0,
        min: 0,
      },
      conversions: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    collection: 'dm_flows',
  }
);

dmFlowSchema.pre('validate', function() {
  this.keywordNormalized = normalizeKeywordInput(this.keyword);

  if (!this.keywordNormalized) {
    this.invalidate('keyword', 'Keyword is required.');
  }

  if (this.targetType === 'specific' && !this.targetMediaId?.trim()) {
    this.invalidate('targetMediaId', 'targetMediaId is required when targetType is "specific".');
  }

  if (this.targetType === 'all') {
    this.targetMediaId = '';
  }

  if (!this.name || !this.name.trim()) {
    const baseKeyword = typeof this.keyword === 'string' ? this.keyword.trim() : '';
    this.name = baseKeyword ? `${baseKeyword} Flow` : 'DM Flow';
  }
});

dmFlowSchema.index({ user: 1, active: 1, trigger: 1, keywordNormalized: 1 });
dmFlowSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('DMFlow', dmFlowSchema);
