const User = require('../models/User');
const Survey = require('../models/Survey');
const Response = require('../models/Response');
const Follow = require('../models/Follow');
const jwt = require('jsonwebtoken');
const { resolveUploadDataUrl } = require('../utils/uploadResolver');

const TOKEN_EXPIRES_IN = '7d';

const DEFAULT_PAGE_SIZE = 6;

async function getFollowStats(userId) {
  const [followerCount, followingCount] = await Promise.all([
    Follow.countDocuments({ followingId: userId }),
    Follow.countDocuments({ followerId: userId })
  ]);

  return { followerCount, followingCount };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function serializeProfile(user) {
  return {
    userId: user.userId,
    email: user.email,
    displayName: user.displayName || user.userId,
    headline: user.headline || '',
    bio: user.bio || '',
    avatarUrl: await resolveUploadDataUrl(user.avatarUrl || ''),
    followerCount: Number.isFinite(user.followerCount) ? user.followerCount : 0,
    followingCount: Number.isFinite(user.followingCount) ? user.followingCount : 0
  };
}

async function serializePublicProfile(user) {
  return {
    userId: user.userId,
    displayName: user.displayName || user.userId,
    headline: user.headline || '',
    bio: user.bio || '',
    avatarUrl: await resolveUploadDataUrl(user.avatarUrl || ''),
    followerCount: Number.isFinite(user.followerCount) ? user.followerCount : 0,
    followingCount: Number.isFinite(user.followingCount) ? user.followingCount : 0
  };
}

async function getMyProfile(req, res) {
  try {
    const user = await User.findOne({ userId: req.user.userId });

    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    const stats = await getFollowStats(user.userId);

    return res.json({
      success: true,
      profile: await serializeProfile({
        ...user.toObject(),
        ...stats
      })
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateMyProfile(req, res) {
  try {
    const user = await User.findOne({ userId: req.user.userId });

    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    const requestedUserId = String(req.body.userId || '').trim();
    const displayName = (req.body.displayName || '').trim();
    const headline = (req.body.headline || '').trim();
    const bio = (req.body.bio || '').trim();
    const removeAvatar = req.body.removeAvatar === 'true';

    const nextUserId = requestedUserId || user.userId;

    if (nextUserId.length < 3 || nextUserId.length > 20) {
      return res.status(400).json({ success: false, message: '아이디는 3자 이상 20자 이하여야 합니다.' });
    }

    if (nextUserId !== user.userId) {
      const duplicateUser = await User.exists({ userId: nextUserId });
      if (duplicateUser) {
        return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
      }
      user.userId = nextUserId;
    }

    user.displayName = displayName.slice(0, 24);
    user.headline = headline.slice(0, 60);
    user.bio = bio.slice(0, 240);

    if (req.file) {
      user.avatarUrl = `/uploads/${req.file.filename}`;
    } else if (removeAvatar) {
      user.avatarUrl = '';
    }

    await user.save();

    const response = { success: true, profile: await serializeProfile(user) };
    if (nextUserId !== req.user.userId) {
      response.token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
    }

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getUserProfile(req, res) {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '사용자 아이디가 필요합니다.' });
    }

    const user = await User.findOne({ userId: targetUserId });
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    const stats = await getFollowStats(targetUserId);

    let isFollowing = false;
    const requesterUserId = req.user ? req.user.userId : null;
    if (requesterUserId && requesterUserId !== targetUserId) {
      isFollowing = Boolean(await Follow.exists({ followerId: requesterUserId, followingId: targetUserId }));
    }

    return res.json({
      success: true,
      profile: {
        ...await serializePublicProfile({
          ...user.toObject(),
          ...stats
        }),
        isFollowing,
        isMe: requesterUserId === targetUserId
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getUserSurveys(req, res) {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;
    const normalizedPage = Number(page) || 1;
    const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '사용자 아이디가 필요합니다.' });
    }

    const requesterUserId = req.user ? req.user.userId : null;
    const filter = requesterUserId === targetUserId
      ? { userId: targetUserId }
      : { userId: targetUserId, isPublic: true };

    const totalSurveys = await Survey.countDocuments(filter);
    const surveys = await Survey.find(filter)
      .sort({ _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    return res.json({
      success: true,
      surveys: surveys.map((survey) => ({
        id: survey._id.toString(),
        title: survey.title,
        description: survey.description,
        isPublic: survey.isPublic,
        img: survey.img,
        created_at: survey.created_at
      })),
      totalSurveys,
      page: normalizedPage,
      totalPages: Math.ceil(totalSurveys / normalizedLimit)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getUserRespondedSurveys(req, res) {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;
    const normalizedPage = Number(page) || 1;
    const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '사용자 아이디가 필요합니다.' });
    }

    const respondedSurveyIds = await Response.distinct('surveyId', { userId: targetUserId });
    const filter = { _id: { $in: respondedSurveyIds }, isPublic: true };
    const totalSurveys = await Survey.countDocuments(filter);
    const surveys = await Survey.find(filter)
      .sort({ _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    return res.json({
      success: true,
      surveys: surveys.map((survey) => ({
        id: survey._id.toString(),
        title: survey.title,
        description: survey.description,
        isPublic: survey.isPublic,
        img: survey.img,
        created_at: survey.created_at
      })),
      totalSurveys,
      page: normalizedPage,
      totalPages: Math.ceil(totalSurveys / normalizedLimit)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function followUser(req, res) {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    const followerId = req.user ? req.user.userId : null;

    if (!followerId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    if (!targetUserId || targetUserId === followerId) {
      return res.status(400).json({ success: false, message: 'follow할 수 없는 사용자입니다.' });
    }

    const targetUser = await User.findOne({ userId: targetUserId });
    const me = await User.findOne({ userId: followerId });
    if (!targetUser || !me) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    await Follow.updateOne(
      { followerId, followingId: targetUserId },
      { $setOnInsert: { followerId, followingId: targetUserId } },
      { upsert: true }
    );

    const followerCount = await Follow.countDocuments({ followingId: targetUserId });
    const followingCount = await Follow.countDocuments({ followerId });

    targetUser.followerCount = followerCount;
    me.followingCount = followingCount;
    await Promise.all([targetUser.save(), me.save()]);

    return res.json({ success: true, isFollowing: true, followerCount, followingCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function unfollowUser(req, res) {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    const followerId = req.user ? req.user.userId : null;

    if (!followerId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    if (!targetUserId || targetUserId === followerId) {
      return res.status(400).json({ success: false, message: 'unfollow할 수 없는 사용자입니다.' });
    }

    const targetUser = await User.findOne({ userId: targetUserId });
    const me = await User.findOne({ userId: followerId });
    if (!targetUser || !me) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    await Follow.deleteOne({ followerId, followingId: targetUserId });

    const followerCount = await Follow.countDocuments({ followingId: targetUserId });
    const followingCount = await Follow.countDocuments({ followerId });

    targetUser.followerCount = followerCount;
    me.followingCount = followingCount;
    await Promise.all([targetUser.save(), me.save()]);

    return res.json({ success: true, isFollowing: false, followerCount, followingCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listFollowers(req, res) {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    const requesterUserId = req.user ? req.user.userId : null;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '사용자 아이디가 필요합니다.' });
    }

    const followerRows = await Follow.find({ followingId: targetUserId }).sort({ _id: -1 }).lean();
    const followerIds = followerRows.map((row) => row.followerId);
    const users = followerIds.length > 0
      ? await User.find({ userId: { $in: followerIds } }).lean()
      : [];

    const userById = new Map(users.map((user) => [user.userId, user]));
    let followingSet = new Set();
    if (requesterUserId) {
      const rows = await Follow.find({ followerId: requesterUserId }).select({ _id: 0, followingId: 1 }).lean();
      followingSet = new Set(rows.map((row) => row.followingId));
    }

    const usersOrdered = await Promise.all(
      followerIds
        .map((id) => userById.get(id))
        .filter(Boolean)
        .map(async (user) => ({
          ...await serializePublicProfile(user),
          isMe: requesterUserId === user.userId,
          isFollowing: requesterUserId ? followingSet.has(user.userId) : false
        }))
    );

    return res.json({ success: true, users: usersOrdered });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function listFollowing(req, res) {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    const requesterUserId = req.user ? req.user.userId : null;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '사용자 아이디가 필요합니다.' });
    }

    const followingRows = await Follow.find({ followerId: targetUserId }).sort({ _id: -1 }).lean();
    const followingIds = followingRows.map((row) => row.followingId);
    const users = followingIds.length > 0
      ? await User.find({ userId: { $in: followingIds } }).lean()
      : [];

    const userById = new Map(users.map((user) => [user.userId, user]));
    let followingSet = new Set();
    if (requesterUserId) {
      const rows = await Follow.find({ followerId: requesterUserId }).select({ _id: 0, followingId: 1 }).lean();
      followingSet = new Set(rows.map((row) => row.followingId));
    }

    const usersOrdered = await Promise.all(
      followingIds
        .map((id) => userById.get(id))
        .filter(Boolean)
        .map(async (user) => ({
          ...await serializePublicProfile(user),
          isMe: requesterUserId === user.userId,
          isFollowing: requesterUserId ? followingSet.has(user.userId) : false
        }))
    );

    return res.json({ success: true, users: usersOrdered });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function searchUsers(req, res) {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const limit = Math.min(Number(req.query.limit) || 12, 30);
    const requesterUserId = req.user ? req.user.userId : null;

    if (!keyword) {
      return res.json({ success: true, users: [], totalUsers: 0 });
    }

    const regex = new RegExp(escapeRegExp(keyword), 'i');
    const users = await User.find({
      $or: [
        { userId: regex },
        { displayName: regex }
      ]
    })
      .sort({ followerCount: -1, _id: -1 })
      .limit(limit)
      .lean();

    let followingSet = new Set();
    if (requesterUserId) {
      const rows = await Follow.find({ followerId: requesterUserId }).select({ _id: 0, followingId: 1 }).lean();
      followingSet = new Set(rows.map((row) => row.followingId));
    }

    const normalizedUsers = await Promise.all(users.map(async (user) => ({
      ...await serializePublicProfile(user),
      isMe: requesterUserId === user.userId,
      isFollowing: requesterUserId ? followingSet.has(user.userId) : false
    })));

    return res.json({ success: true, users: normalizedUsers, totalUsers: normalizedUsers.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getUserSurveys,
  getUserRespondedSurveys,
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing,
  searchUsers
};