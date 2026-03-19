/**
 * 기존 설문의 참여자 수를 Response 컬렉션에서 집계해
 * Survey.participantCount 필드를 일괄 업데이트하는 마이그레이션 스크립트.
 *
 * 실행: node backend/scripts/migrateParticipantCount.js
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

  const Response = require('../models/Response');
  const Survey   = require('../models/Survey');

  // 설문별 고유 참여자 수 집계
  const counts = await Response.aggregate([
    {
      $match: { userId: { $ne: null } }
    },
    {
      $group: {
        _id: { surveyId: '$surveyId', userId: '$userId' }
      }
    },
    {
      $group: {
        _id: '$_id.surveyId',
        participantCount: { $sum: 1 }
      }
    }
  ]);

  console.log(`집계된 설문 수: ${counts.length}`);

  let updated = 0;
  for (const { _id, participantCount } of counts) {
    await Survey.updateOne({ _id }, { $set: { participantCount } });
    updated++;
  }

  // 응답이 하나도 없는 설문은 0으로 초기화
  await Survey.updateMany(
    { participantCount: { $exists: false } },
    { $set: { participantCount: 0 } }
  );

  console.log(`업데이트된 설문: ${updated}개`);
  console.log('마이그레이션 완료!');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('마이그레이션 오류:', err);
  process.exit(1);
});
