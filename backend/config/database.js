const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || 'survly',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
  } catch (error) {
    const message = String(error?.message || 'Unknown MongoDB connection error');
    const atlasNetworkHint =
      message.includes('ReplicaSetNoPrimary') ||
      message.includes('ServerSelectionError') ||
      message.includes('querySrv') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND');

    if (atlasNetworkHint) {
      const wrapped = new Error(
        [
          'MongoDB Atlas에 연결하지 못했습니다.',
          '1) Atlas Network Access에 현재 공인 IP를 허용했는지 확인',
          '2) Atlas 연결 문자열(MONGODB_URI) 사용자명/비밀번호 확인',
          '3) 로컬 방화벽/회사망에서 27017 outbound 차단 여부 확인'
        ].join('\n')
      );
      wrapped.cause = error;
      throw wrapped;
    }

    throw error;
  }
}

module.exports = {
  connectDatabase
};
