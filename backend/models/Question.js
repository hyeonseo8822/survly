const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
  type: { type: String, required: true, trim: true },
  question: { type: String, required: true },
  isRequired: { type: Boolean, default: false }
}, {
  versionKey: false
});

module.exports = mongoose.models.Question || mongoose.model('Question', questionSchema);
