const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, required: true },
  userId: { type: String, required: true, trim: true, unique: true },
  displayName: { type: String, default: '', trim: true },
  headline: { type: String, default: '', trim: true },
  bio: { type: String, default: '', trim: true },
  avatarUrl: { type: String, default: '', trim: true },
  followerCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
