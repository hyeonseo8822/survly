const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  userId: { type: String, required: true, trim: true },
  link: { type: String, default: null },
  img: { type: String, default: 'default_img' }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Only private survey links should be unique. Null values are excluded from this index.
surveySchema.index(
  { link: 1 },
  { unique: true, partialFilterExpression: { link: { $type: 'string' } } }
);

module.exports = mongoose.models.Survey || mongoose.model('Survey', surveySchema);
