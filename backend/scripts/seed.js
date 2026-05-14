const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const { connectDatabase } = require('../config/database');
const User = require('../models/User');
const Survey = require('../models/Survey');
const Question = require('../models/Question');
const Option = require('../models/Option');
const Response = require('../models/Response');

async function seed() {
  await connectDatabase();

  // Migrate old unique index on link so multiple null links are allowed.
  try {
    await Survey.collection.dropIndex('link_1');
  } catch (error) {
    // Ignore when the index does not exist yet.
  }

  await Survey.collection.createIndex(
    { link: 1 },
    { unique: true, partialFilterExpression: { link: { $type: 'string' } } }
  );

  await Promise.all([
    Response.deleteMany({}),
    Option.deleteMany({}),
    Question.deleteMany({}),
    Survey.deleteMany({}),
    User.deleteMany({})
  ]);

  const users = await User.insertMany([
    {
      email: 'demo@survly.com',
      password: await bcrypt.hash('1234', 10),
      userId: 'demoUser'
    },
    {
      email: 'alice@survly.com',
      password: await bcrypt.hash('1234', 10),
      userId: 'alice'
    },
    {
      email: 'bob@survly.com',
      password: await bcrypt.hash('1234', 10),
      userId: 'bob'
    }
  ]);

  const [demoUser, alice, bob] = users;

  const surveys = await Survey.insertMany([
    {
      title: '점심 메뉴 선호도 조사',
      description: '팀 점심 메뉴를 고르기 위한 간단한 설문입니다.',
      isPublic: true,
      userId: demoUser.userId,
      img: 'default_img'
    },
    {
      title: '재택 근무 만족도 조사',
      description: '업무 환경 개선을 위한 내부 설문입니다.',
      isPublic: true,
      userId: alice.userId,
      img: 'default_img'
    },
    {
      title: '팀 회고 비공개 설문',
      description: '익명 회고를 위한 비공개 설문입니다.',
      isPublic: false,
      userId: demoUser.userId,
      link: 'sample-private-link',
      img: 'default_img'
    }
  ]);

  const [lunchSurvey, remoteSurvey, privateSurvey] = surveys;

  const questions = await Question.insertMany([
    {
      surveyId: lunchSurvey._id,
      type: 'multiple-choice',
      question: '가장 좋아하는 메뉴를 선택하세요.',
      isRequired: true
    },
    {
      surveyId: lunchSurvey._id,
      type: 'text',
      question: '추천하고 싶은 메뉴가 있다면 적어주세요.',
      isRequired: false
    },
    {
      surveyId: remoteSurvey._id,
      type: 'multiple-choice',
      question: '현재 재택 근무 만족도는 어느 정도인가요?',
      isRequired: true
    },
    {
      surveyId: remoteSurvey._id,
      type: 'text',
      question: '개선이 필요한 점을 자유롭게 적어주세요.',
      isRequired: false
    },
    {
      surveyId: privateSurvey._id,
      type: 'text',
      question: '이번 주 가장 잘한 점은 무엇인가요?',
      isRequired: true
    }
  ]);

  await Option.insertMany([
    { questionId: questions[0]._id, optionText: '한식' },
    { questionId: questions[0]._id, optionText: '중식' },
    { questionId: questions[0]._id, optionText: '일식' },
    { questionId: questions[0]._id, optionText: '양식' },
    { questionId: questions[2]._id, optionText: '매우 만족' },
    { questionId: questions[2]._id, optionText: '만족' },
    { questionId: questions[2]._id, optionText: '보통' },
    { questionId: questions[2]._id, optionText: '불만족' }
  ]);

  await Response.insertMany([
    {
      surveyId: lunchSurvey._id,
      questionId: questions[0]._id,
      answer: '한식',
      userId: demoUser.userId
    },
    {
      surveyId: lunchSurvey._id,
      questionId: questions[1]._id,
      answer: '국밥이 좋아요.',
      userId: demoUser.userId
    },
    {
      surveyId: lunchSurvey._id,
      questionId: questions[0]._id,
      answer: '일식',
      userId: alice.userId
    },
    {
      surveyId: remoteSurvey._id,
      questionId: questions[2]._id,
      answer: '만족',
      userId: bob.userId
    },
    {
      surveyId: remoteSurvey._id,
      questionId: questions[3]._id,
      answer: '회의 시간이 조금 더 짧아지면 좋겠습니다.',
      userId: bob.userId
    },
    {
      surveyId: privateSurvey._id,
      questionId: questions[4]._id,
      answer: '서로 코드 리뷰를 빠르게 도와줬어요.',
      userId: null
    }
  ]);

  console.log('Seed 완료: demoUser, alice, bob / 비밀번호 1234');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed 실패:', error);
  process.exit(1);
});
