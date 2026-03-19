const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: { type: String, required: true, trim: true, index: true },
  followingId: { type: String, required: true, trim: true, index: true }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

module.exports = mongoose.models.Follow || mongoose.model('Follow', followSchema);
