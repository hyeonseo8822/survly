const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function register(req, res) {
  const { email, password, userId, username } = req.body;

  if (!email || !password || !userId || !username) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락' });
  }

  try {
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { userId }
      ]
    }).lean();

    if (existingUser) {
      return res.status(409).json({ success: false, message: '이미 사용 중인 이메일 또는 아이디입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      userId,
      displayName: String(username).trim().slice(0, 24)
    });

    res.json({ success: true, userId: user.userId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function login(req, res) {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락' });
  }

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ success: false, message: '존재하지 않는 사용자' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: '비밀번호 불일치' });
    }

    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user.userId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function checkUserIdAvailability(req, res) {
  const candidate = String(req.query.userId || '').trim();

  if (!candidate) {
    return res.status(400).json({ success: false, message: '아이디를 입력해주세요.' });
  }

  try {
    const exists = await User.exists({ userId: candidate });
    return res.json({ success: true, available: !exists });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  register,
  login,
  checkUserIdAvailability
};
