/**
 * Rebuilds User.followerCount and User.followingCount from the Follow collection.
 *
 * Run:
 *   node backend/scripts/reconcileFollowCounts.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME || 'survly'
  });

  console.log('MongoDB 연결 완료');

  const Follow = require('../models/Follow');
  const User = require('../models/User');

  const followerCounts = await Follow.aggregate([
    {
      $group: {
        _id: '$followingId',
        followerCount: { $sum: 1 }
      }
    }
  ]);

  const followingCounts = await Follow.aggregate([
    {
      $group: {
        _id: '$followerId',
        followingCount: { $sum: 1 }
      }
    }
  ]);

  const followerCountMap = new Map(followerCounts.map((item) => [item._id, item.followerCount]));
  const followingCountMap = new Map(followingCounts.map((item) => [item._id, item.followingCount]));

  const users = await User.find({}).select({ userId: 1 }).lean();
  let updated = 0;

  for (const user of users) {
    const followerCount = followerCountMap.get(user.userId) || 0;
    const followingCount = followingCountMap.get(user.userId) || 0;

    await User.updateOne(
      { userId: user.userId },
      { $set: { followerCount, followingCount } }
    );
    updated++;
  }

  console.log(`업데이트된 사용자 수: ${updated}개`);
  console.log('팔로우 카운트 재동기화 완료');
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('재동기화 오류:', error);
  process.exit(1);
});
