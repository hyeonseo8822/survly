const mongoose = require('mongoose');

const surveyBookmarkSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true, index: true },
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
  listId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookmarkList', required: true, index: true }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

surveyBookmarkSchema.index({ userId: 1, surveyId: 1, listId: 1 }, { unique: true });

module.exports = mongoose.models.SurveyBookmark || mongoose.model('SurveyBookmark', surveyBookmarkSchema);
