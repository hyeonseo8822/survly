const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
  userId: { type: String, required: true, trim: true, index: true },
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  content: { type: String, required: true, trim: true, maxlength: 300 }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
