const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  embedUrl: { type: String, default: '' },
  isPublic: { type: Boolean, default: false },
  responseTabPublic: { type: Boolean, default: false },
  userId: { type: String, required: true, trim: true },
  link: { type: String, default: null },
  img: { type: String, default: 'default_img' },
  participantCount: { type: Number, default: 0 }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Only private survey links should be unique. Null values are excluded from this index.
surveySchema.index(
  { link: 1 },
  { unique: true, partialFilterExpression: { link: { $type: 'string' } } }
);

// Indexes to improve list / search performance
// - filter by public surveys and sort by creation time
surveySchema.index({ isPublic: 1, created_at: -1 });
// - filter by owner (used in profile/following queries)
surveySchema.index({ userId: 1 });
// - text index for title search (supports text search; regex may still be unindexed)
surveySchema.index({ title: 'text' });

module.exports = mongoose.models.Survey || mongoose.model('Survey', surveySchema);
