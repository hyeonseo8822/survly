const mongoose = require('mongoose');

const bookmarkListSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 24 }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

bookmarkListSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.BookmarkList || mongoose.model('BookmarkList', bookmarkListSchema);
