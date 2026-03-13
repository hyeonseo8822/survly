const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, required: true },
  userId: { type: String, required: true, trim: true, unique: true }
}, {
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
