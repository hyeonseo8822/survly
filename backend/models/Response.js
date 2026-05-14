const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  answer: { type: String, required: true },
  userId: { type: String, default: null, trim: true }
}, {
  versionKey: false,
  timestamps: { createdAt: 'submitted_at', updatedAt: false }
});

module.exports = mongoose.models.Response || mongoose.model('Response', responseSchema);
