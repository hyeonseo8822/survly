const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  optionText: { type: String, required: true }
}, {
  versionKey: false
});

module.exports = mongoose.models.Option || mongoose.model('Option', optionSchema);
