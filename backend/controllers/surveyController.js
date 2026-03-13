const crypto = require('crypto');
const mongoose = require('mongoose');
const Survey = require('../models/Survey');
const Question = require('../models/Question');
const Option = require('../models/Option');
const Response = require('../models/Response');
const {
  isValidObjectId,
  parseQuestionsPayload,
  normalizeBoolean,
  toSurveyResponse,
  getSurveyDetails
} = require('../utils/surveyUtils');

const DEFAULT_PAGE_SIZE = 6;

async function createSurvey(req, res) {
  const { title, description = '', isPublic, img } = req.body;
  const questions = parseQuestionsPayload(req.body.questions);
  const userId = req.user.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  }

  if (!title || !questions) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락 또는 질문 데이터 형식이 올바르지 않습니다.' });
  }

  const surveyIsPublic = normalizeBoolean(isPublic);
  const finalImg = req.file ? req.file.filename : (img || 'default_img');
  const link = surveyIsPublic ? null : crypto.randomBytes(8).toString('hex');
  const session = await mongoose.startSession();

  try {
    let createdSurvey;

    await session.withTransaction(async () => {
      const createdSurveys = await Survey.create([{
        title,
        description,
        isPublic: surveyIsPublic,
        userId,
        link,
        img: finalImg
      }], { session });

      createdSurvey = createdSurveys[0];

      const questionDocs = questions.map((question) => ({
        surveyId: createdSurvey._id,
        type: question.type,
        question: question.question,
        isRequired: normalizeBoolean(question.isRequired)
      }));

      if (questionDocs.length === 0) {
        return;
      }

      const createdQuestions = await Question.insertMany(questionDocs, { session });
      const optionDocs = [];

      createdQuestions.forEach((createdQuestion, index) => {
        const sourceQuestion = questions[index];
        if (Array.isArray(sourceQuestion.options) && sourceQuestion.options.length > 0) {
          sourceQuestion.options.forEach((optionText) => {
            optionDocs.push({ questionId: createdQuestion._id, optionText });
          });
        }
      });

      if (optionDocs.length > 0) {
        await Option.insertMany(optionDocs, { session });
      }
    });

    res.status(201).json({ success: true, surveyId: createdSurvey._id.toString(), link });
  } catch (error) {
    res.status(500).json({ success: false, message: '설문 저장 실패', error: error.message });
  } finally {
    await session.endSession();
  }
}

async function updateSurvey(req, res) {
  const { surveyId } = req.params;
  const { title, description = '', img } = req.body;
  const questions = parseQuestionsPayload(req.body.questions);
  const userId = req.user.userId;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  }

  if (!title || !questions) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락 또는 질문 데이터 형식이 올바르지 않습니다.' });
  }

  const survey = await Survey.findById(surveyId);
  if (!survey) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  if (survey.userId !== userId) {
    return res.status(403).json({ success: false, message: '설문을 수정할 권한이 없습니다.' });
  }

  const finalImg = req.file ? req.file.filename : (img || 'default_img');
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Survey.updateOne(
        { _id: survey._id },
        { $set: { title, description, img: finalImg } },
        { session }
      );

      const existingQuestions = await Question.find({ surveyId: survey._id }).select({ _id: 1 }).session(session).lean();
      const existingQuestionIds = existingQuestions.map((question) => question._id);

      if (existingQuestionIds.length > 0) {
        await Option.deleteMany({ questionId: { $in: existingQuestionIds } }, { session });
        await Question.deleteMany({ surveyId: survey._id }, { session });
      }

      if (questions.length === 0) {
        return;
      }

      const createdQuestions = await Question.insertMany(questions.map((question) => ({
        surveyId: survey._id,
        type: question.type,
        question: question.question,
        isRequired: normalizeBoolean(question.isRequired)
      })), { session });

      const optionDocs = [];
      createdQuestions.forEach((createdQuestion, index) => {
        const sourceQuestion = questions[index];
        if (Array.isArray(sourceQuestion.options) && sourceQuestion.options.length > 0) {
          sourceQuestion.options.forEach((optionText) => {
            optionDocs.push({ questionId: createdQuestion._id, optionText });
          });
        }
      });

      if (optionDocs.length > 0) {
        await Option.insertMany(optionDocs, { session });
      }
    });

    res.json({ success: true, message: '설문지가 성공적으로 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '설문 수정 실패', error: error.message });
  } finally {
    await session.endSession();
  }
}

async function deleteSurvey(req, res) {
  const { surveyId } = req.params;
  const userId = req.user.userId;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  }

  const survey = await Survey.findById(surveyId);
  if (!survey) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  if (survey.userId !== userId) {
    return res.status(403).json({ success: false, message: '설문을 삭제할 권한이 없습니다.' });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const questions = await Question.find({ surveyId: survey._id }).select({ _id: 1 }).session(session).lean();
      const questionIds = questions.map((question) => question._id);

      await Response.deleteMany({ surveyId: survey._id }, { session });

      if (questionIds.length > 0) {
        await Option.deleteMany({ questionId: { $in: questionIds } }, { session });
      }

      await Question.deleteMany({ surveyId: survey._id }, { session });
      await Survey.deleteOne({ _id: survey._id }, { session });
    });

    res.json({ success: true, message: '설문지가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '설문 삭제 실패', error: error.message });
  } finally {
    await session.endSession();
  }
}

async function listSurveys(req, res) {
  const { isPublic, keyword, page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;
  const normalizedPage = Number(page) || 1;
  const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;
  const filter = {};

  if (isPublic !== undefined) {
    filter.isPublic = normalizeBoolean(isPublic);
  }

  if (keyword) {
    filter.title = { $regex: keyword, $options: 'i' };
  }

  try {
    const totalSurveys = await Survey.countDocuments(filter);
    const surveys = await Survey.find(filter)
      .sort({ _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    res.json({
      success: true,
      surveys: surveys.map(toSurveyResponse),
      totalSurveys,
      page: normalizedPage,
      totalPages: Math.ceil(totalSurveys / normalizedLimit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getSurveyById(req, res) {
  const { surveyId } = req.params;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
  }

  try {
    const survey = await Survey.findById(surveyId).lean();
    if (!survey) {
      return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    }

    const surveyDetails = await getSurveyDetails(survey);
    res.json({ success: true, survey: surveyDetails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getSurveyByLink(req, res) {
  const { link } = req.params;

  try {
    const survey = await Survey.findOne({ link }).lean();
    if (!survey) {
      return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    }

    const surveyDetails = await getSurveyDetails(survey);
    res.json({ success: true, survey: surveyDetails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getMySurveys(req, res) {
  const userId = req.user.userId;
  const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;
  const normalizedPage = Number(page) || 1;
  const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;

  if (!userId) {
    return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  }

  try {
    const totalSurveys = await Survey.countDocuments({ userId });
    const surveys = await Survey.find({ userId })
      .sort({ _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    res.json({
      success: true,
      surveys: surveys.map(toSurveyResponse),
      totalSurveys,
      page: normalizedPage,
      totalPages: Math.ceil(totalSurveys / normalizedLimit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getMyRespondedSurveys(req, res) {
  const userId = req.user.userId;
  const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;
  const normalizedPage = Number(page) || 1;
  const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;

  if (!userId) {
    return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  }

  try {
    const respondedSurveyIds = await Response.distinct('surveyId', { userId });
    const filter = { _id: { $in: respondedSurveyIds }, isPublic: true };
    const totalSurveys = await Survey.countDocuments(filter);
    const surveys = await Survey.find(filter)
      .sort({ _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    res.json({
      success: true,
      surveys: surveys.map(toSurveyResponse),
      totalSurveys,
      page: normalizedPage,
      totalPages: Math.ceil(totalSurveys / normalizedLimit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function submitResponses(req, res) {
  const { surveyId } = req.params;
  const { answers } = req.body;
  const userId = req.user ? req.user.userId : null;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ success: false, message: '최소 하나의 답변이 필요합니다.' });
  }

  const invalidAnswer = answers.find((answer) => !isValidObjectId(answer.questionId) || typeof answer.answer !== 'string');
  if (invalidAnswer) {
    return res.status(400).json({ success: false, message: '답변 데이터 형식이 올바르지 않습니다.' });
  }

  try {
    await Response.insertMany(answers.map((answer) => ({
      surveyId,
      questionId: answer.questionId,
      answer: answer.answer,
      userId
    })));

    res.json({ success: true, message: '응답 제출 완료' });
  } catch (error) {
    res.status(500).json({ success: false, message: '응답 저장 오류', error: error.message });
  }
}

async function getSurveyResults(req, res) {
  const { surveyId } = req.params;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
  }

  try {
    const questions = await Question.find({ surveyId }).sort({ _id: 1 }).lean();
    const responses = await Response.find({ surveyId }).sort({ _id: 1 }).lean();
    const formatted = new Map();

    questions.forEach((question) => {
      formatted.set(question._id.toString(), {
        questionId: question._id.toString(),
        question: question.question,
        type: question.type,
        summary: {},
        comments: []
      });
    });

    responses.forEach((response) => {
      const key = response.questionId.toString();
      const current = formatted.get(key);
      if (!current || !response.answer) {
        return;
      }

      if (current.type === 'multiple-choice') {
        current.summary[response.answer] = (current.summary[response.answer] || 0) + 1;
      } else {
        current.comments.push(response.answer);
      }
    });

    res.json({ success: true, surveyId, results: Array.from(formatted.values()) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  createSurvey,
  updateSurvey,
  deleteSurvey,
  listSurveys,
  getSurveyById,
  getSurveyByLink,
  getMySurveys,
  getMyRespondedSurveys,
  submitResponses,
  getSurveyResults
};
