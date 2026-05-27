const crypto = require('crypto');
const mongoose = require('mongoose');
const Survey = require('../models/Survey');
const SurveyBookmark = require('../models/SurveyBookmark');
const Question = require('../models/Question');
const Option = require('../models/Option');
const Response = require('../models/Response');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Follow = require('../models/Follow');
const {
  isValidObjectId,
  parseQuestionsPayload,
  normalizeBoolean,
  toSurveyResponse,
  getSurveyDetails
} = require('../utils/surveyUtils');
const { resolveUploadDataUrl } = require('../utils/uploadResolver');

const DEFAULT_PAGE_SIZE = 6;

async function createSurvey(req, res) {
  const { title, description = '', embedUrl = '', isPublic, responseTabPublic, img } = req.body;
  const questions = parseQuestionsPayload(req.body.questions);
  const userId = req.user.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  }

  if (!title || !questions) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락 또는 질문 데이터 형식이 올바르지 않습니다.' });
  }

  const surveyIsPublic = normalizeBoolean(isPublic);
  const surveyResponseTabPublic = normalizeBoolean(responseTabPublic);
  const finalImg = req.file ? req.file.filename : (img || 'default_img');
  const link = surveyIsPublic ? null : crypto.randomBytes(8).toString('hex');
  const session = await mongoose.startSession();

  try {
    let createdSurvey;

    await session.withTransaction(async () => {
      const createdSurveys = await Survey.create([{
        title,
        description,
        embedUrl: String(embedUrl || '').trim(),
        isPublic: surveyIsPublic,
        responseTabPublic: surveyResponseTabPublic,
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
  const { title, description = '', embedUrl = '', img, isPublic, responseTabPublic } = req.body;
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
  const nextIsPublic = isPublic === undefined ? survey.isPublic : normalizeBoolean(isPublic);
  const nextResponseTabPublic = responseTabPublic === undefined
    ? Boolean(survey.responseTabPublic)
    : normalizeBoolean(responseTabPublic);
  const nextLink = nextIsPublic ? null : (survey.link || crypto.randomBytes(8).toString('hex'));
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Survey.updateOne(
        { _id: survey._id },
        {
          $set: {
            title,
            description,
            embedUrl: String(embedUrl || '').trim(),
            img: finalImg,
            isPublic: nextIsPublic,
            responseTabPublic: nextResponseTabPublic,
            link: nextLink
          }
        },
        { session }
      );

      const existingQuestions = await Question.find({ surveyId: survey._id })
        .sort({ _id: 1 })
        .session(session)
        .lean();
      const existingQuestionIds = existingQuestions.map((question) => question._id);

      const existingOptions = existingQuestionIds.length > 0
        ? await Option.find({ questionId: { $in: existingQuestionIds } }).sort({ _id: 1 }).session(session).lean()
        : [];

      const optionsByQuestionId = new Map();
      existingOptions.forEach((option) => {
        const key = option.questionId.toString();
        if (!optionsByQuestionId.has(key)) {
          optionsByQuestionId.set(key, []);
        }
        optionsByQuestionId.get(key).push(option.optionText);
      });

      const normalizeQuestion = (question) => ({
        type: question.type,
        question: String(question.question || '').trim(),
        isRequired: normalizeBoolean(question.isRequired),
        options: Array.isArray(question.options)
          ? question.options.map((option) => String(option || '').trim()).filter((option) => option !== '')
          : []
      });

      const existingNormalized = existingQuestions.map((question) => normalizeQuestion({
        type: question.type,
        question: question.question,
        isRequired: question.isRequired,
        options: optionsByQuestionId.get(question._id.toString()) || []
      }));

      const incomingNormalized = questions.map((question) => normalizeQuestion(question));
      const isQuestionStructureChanged = JSON.stringify(existingNormalized) !== JSON.stringify(incomingNormalized);

      if (!isQuestionStructureChanged) {
        return;
      }

      if (existingQuestionIds.length > 0) {
        await Response.deleteMany({ surveyId: survey._id }, { session });
        await Option.deleteMany({ questionId: { $in: existingQuestionIds } }, { session });
        await Question.deleteMany({ surveyId: survey._id }, { session });
      }

      if (incomingNormalized.length === 0) {
        return;
      }

      const createdQuestions = await Question.insertMany(incomingNormalized.map((question) => ({
        surveyId: survey._id,
        type: question.type,
        question: question.question,
        isRequired: question.isRequired
      })), { session });

      const optionDocs = [];
      createdQuestions.forEach((createdQuestion, index) => {
        const sourceQuestion = incomingNormalized[index];
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
  const { isPublic, keyword, page = 1, limit = DEFAULT_PAGE_SIZE, sortBy = 'popular' } = req.query;
  const normalizedPage = Number(page) || 1;
  const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;
  const filter = {};
  const requesterUserId = req.user ? req.user.userId : null;

  if (isPublic !== undefined) {
    filter.isPublic = normalizeBoolean(isPublic);
  }

  if (keyword) {
    filter.title = { $regex: keyword, $options: 'i' };
  }

  if (sortBy === 'following') {
    if (!requesterUserId) {
      return res.json({ success: true, surveys: [], totalSurveys: 0, page: normalizedPage, totalPages: 0 });
    }

    const followingRows = await Follow.find({ followerId: requesterUserId }).select({ _id: 0, followingId: 1 }).lean();
    const followingIds = followingRows.map((row) => row.followingId);

    if (followingIds.length === 0) {
      return res.json({ success: true, surveys: [], totalSurveys: 0, page: normalizedPage, totalPages: 0 });
    }

    filter.userId = { $in: followingIds };
  }

  const sortOptions = {
    newest: { _id: -1 },
    popular: { bookmarkCount: -1, _id: -1 },
    following: { _id: -1 }
  };
  const sort = sortOptions[sortBy] || sortOptions.popular;

  try {
    const totalSurveys = await Survey.countDocuments(filter);
    const surveys = await Survey.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: SurveyBookmark.collection.name,
          localField: '_id',
          foreignField: 'surveyId',
          as: 'bookmarkDocs'
        }
      },
      {
        $addFields: {
          bookmarkCount: {
            $size: {
              $setUnion: ['$bookmarkDocs.userId', []]
            }
          }
        }
      },
      { $project: { bookmarkDocs: 0 } },
      { $sort: sort },
      { $skip: (normalizedPage - 1) * normalizedLimit },
      { $limit: normalizedLimit }
    ]);

    res.json({
      success: true,
      surveys: surveys.map((survey) => ({
        ...toSurveyResponse(survey),
        bookmarkCount: Number(survey.bookmarkCount) || 0
      })),
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
  const overwrite = req.body.overwrite === true;
  const userId = req.user ? req.user.userId : null;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

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
    const hasExistingResponse = await Response.exists({ surveyId, userId });
    if (hasExistingResponse && !overwrite) {
      return res.status(409).json({ success: false, code: 'ALREADY_PARTICIPATED', message: '이미 참여하신 설문입니다.' });
    }

    if (hasExistingResponse && overwrite) {
      await Response.deleteMany({ surveyId, userId });
    }

    await Response.insertMany(answers.map((answer) => ({
      surveyId,
      questionId: answer.questionId,
      answer: answer.answer,
      userId
    })));

    if (!hasExistingResponse) {
      await Survey.updateOne({ _id: surveyId }, { $inc: { participantCount: 1 } });
    }

    res.json({ success: true, message: overwrite ? '응답 수정 완료' : '응답 제출 완료' });
  } catch (error) {
    res.status(500).json({ success: false, message: '응답 저장 오류', error: error.message });
  }
}

async function getSurveyResults(req, res) {
  const { surveyId } = req.params;
  const requesterUserId = req.user ? req.user.userId : null;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
  }

  try {
    const survey = await Survey.findById(surveyId).select({ _id: 1, userId: 1, isPublic: 1, responseTabPublic: 1 }).lean();
    if (!survey) {
      return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    }

    const isCreator = requesterUserId && survey.userId === requesterUserId;
    const hasParticipated = requesterUserId ? Boolean(await Response.exists({ surveyId, userId: requesterUserId })) : false;
    const isLegacyPublicSurvey = survey.responseTabPublic === undefined && survey.isPublic === true;
    const isResponseTabOpen = survey.responseTabPublic === true || isLegacyPublicSurvey;
    const canViewResults = Boolean(isResponseTabOpen) || Boolean(isCreator) || Boolean(hasParticipated);

    if (!canViewResults) {
      return res.status(403).json({ success: false, message: '응답 결과를 볼 권한이 없습니다.' });
    }

    const questions = await Question.find({ surveyId }).sort({ _id: 1 }).lean();
    const responses = await Response.find({ surveyId }).sort({ _id: 1 }).lean();
    const formatted = new Map();

    // 내 응답만 따로 추출
    const myAnswersByQid = new Map();
    if (requesterUserId) {
      responses.forEach((response) => {
        if (String(response.userId) === String(requesterUserId)) {
          myAnswersByQid.set(response.questionId.toString(), response.answer);
        }
      });
    }

    questions.forEach((question) => {
      formatted.set(question._id.toString(), {
        questionId: question._id.toString(),
        question: question.question,
        type: question.type,
        summary: {},
        comments: [],
        myAnswer: myAnswersByQid.get(question._id.toString()) || null
      });
    });

    responses.forEach((response) => {
      const key = response.questionId.toString();
      const current = formatted.get(key);
      if (!current || !response.answer) {
        return;
      }

      if (current.type === 'multiple-choice' || current.type === 'rating' || current.type === 'date') {
        current.summary[response.answer] = (current.summary[response.answer] || 0) + 1;
        return;
      }

      if (current.type === 'checkboxes') {
        try {
          const parsed = JSON.parse(response.answer);
          if (Array.isArray(parsed)) {
            parsed.forEach((option) => {
              const optionText = String(option || '').trim();
              if (optionText) {
                current.summary[optionText] = (current.summary[optionText] || 0) + 1;
              }
            });
            return;
          }
        } catch (error) {
          // Fallback to plain-text aggregation for legacy malformed values.
        }

        current.summary[response.answer] = (current.summary[response.answer] || 0) + 1;
        return;
      }

      current.comments.push(response.answer);
    });

    res.json({ success: true, surveyId, results: Array.from(formatted.values()) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getMyParticipationStatus(req, res) {
  const { surveyId } = req.params;
  const userId = req.user.userId;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    const survey = await Survey.findById(surveyId).select({ _id: 1, userId: 1 }).lean();
    if (!survey) {
      return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    }

    const isCreator = survey.userId === userId;
    const hasParticipated = isCreator ? true : Boolean(await Response.exists({ surveyId, userId }));

    return res.json({ success: true, isCreator, hasParticipated });
  } catch (error) {
    return res.status(500).json({ success: false, message: '참여 여부를 확인하는 중 오류가 발생했습니다.', error: error.message });
  }
}

async function listSurveyComments(req, res) {
  const { surveyId } = req.params;

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
  }

  try {
    const survey = await Survey.findById(surveyId).select({ _id: 1, userId: 1 }).lean();
    if (!survey) {
      return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    }

    const comments = await Comment.find({ surveyId })
      .sort({ _id: -1 })
      .limit(200)
      .lean();

    const userIds = Array.from(new Set(comments.map((comment) => comment.userId).filter(Boolean)));
    const users = userIds.length > 0
      ? await User.find({ userId: { $in: userIds } }).select({ _id: 0, userId: 1, displayName: 1, avatarUrl: 1 }).lean()
      : [];
    const userByUserId = new Map(users.map((user) => [user.userId, user]));

    const normalized = comments.map((comment) => {
      const profile = userByUserId.get(comment.userId) || {};
      return {
        id: comment._id.toString(),
        surveyId: comment.surveyId.toString(),
        userId: comment.userId,
        displayName: profile.displayName || comment.userId,
        avatarUrl: resolveUploadDataUrl(profile.avatarUrl || ''),
        parentCommentId: comment.parentCommentId ? comment.parentCommentId.toString() : null,
        content: comment.content,
        created_at: comment.created_at,
        replies: []
      };
    });

    const byId = new Map(normalized.map((comment) => [comment.id, comment]));
    const roots = [];

    normalized.forEach((comment) => {
      if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
        byId.get(comment.parentCommentId).replies.push(comment);
      } else {
        roots.push(comment);
      }
    });

    return res.json({
      success: true,
      comments: roots
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '댓글을 불러오는 중 오류가 발생했습니다.', error: error.message });
  }
}

async function createSurveyComment(req, res) {
  const { surveyId } = req.params;
  const userId = req.user.userId;
  const parentCommentId = req.body.parentCommentId || null;
  const content = String(req.body.content || '').trim();

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
  }

  if (!content) {
    return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
  }

  if (content.length > 300) {
    return res.status(400).json({ success: false, message: '댓글은 300자 이하로 입력해주세요.' });
  }

  try {
    const survey = await Survey.findById(surveyId).select({ _id: 1 }).lean();
    if (!survey) {
      return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    }

    const isCreator = survey.userId === userId;
    const hasParticipated = isCreator ? true : Boolean(await Response.exists({ surveyId, userId }));
    if (!hasParticipated) {
      return res.status(403).json({ success: false, message: '설문 참여자만 댓글을 작성할 수 있습니다.' });
    }

    let normalizedParentCommentId = null;
    if (parentCommentId) {
      if (!isValidObjectId(parentCommentId)) {
        return res.status(400).json({ success: false, message: '유효하지 않은 답글 대상입니다.' });
      }

      const parentComment = await Comment.findById(parentCommentId).select({ _id: 1, surveyId: 1 }).lean();
      if (!parentComment || parentComment.surveyId.toString() !== surveyId) {
        return res.status(400).json({ success: false, message: '답글 대상 댓글을 찾을 수 없습니다.' });
      }
      normalizedParentCommentId = parentComment._id;
    }

    const createdComment = await Comment.create({
      surveyId,
      userId,
      parentCommentId: normalizedParentCommentId,
      content
    });

    const profile = await User.findOne({ userId }).select({ _id: 0, displayName: 1, avatarUrl: 1 }).lean();

    return res.status(201).json({
      success: true,
      comment: {
        id: createdComment._id.toString(),
        surveyId: createdComment.surveyId.toString(),
        userId: createdComment.userId,
        displayName: profile?.displayName || createdComment.userId,
        avatarUrl: resolveUploadDataUrl(profile?.avatarUrl || ''),
        parentCommentId: createdComment.parentCommentId ? createdComment.parentCommentId.toString() : null,
        content: createdComment.content,
        created_at: createdComment.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '댓글 저장 중 오류가 발생했습니다.', error: error.message });
  }
}

async function listMyComments(req, res) {
  const userId = req.user.userId;
  const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;
  const normalizedPage = Number(page) || 1;
  const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    const totalComments = await Comment.countDocuments({ userId });
    const comments = await Comment.find({ userId })
      .sort({ _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    const surveyIds = Array.from(new Set(comments.map((comment) => comment.surveyId?.toString()).filter(Boolean)));
    const surveys = surveyIds.length > 0
      ? await Survey.find({ _id: { $in: surveyIds } }).select({ _id: 1, title: 1 }).lean()
      : [];
    const surveyMap = new Map(surveys.map((survey) => [survey._id.toString(), survey.title]));

    return res.json({
      success: true,
      comments: comments.map((comment) => ({
        id: comment._id.toString(),
        surveyId: comment.surveyId.toString(),
        surveyTitle: surveyMap.get(comment.surveyId.toString()) || '삭제된 설문',
        content: comment.content,
        created_at: comment.created_at
      })),
      totalComments,
      page: normalizedPage,
      totalPages: Math.ceil(totalComments / normalizedLimit)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '내 댓글을 불러오는 중 오류가 발생했습니다.', error: error.message });
  }
}

async function updateMyComment(req, res) {
  const userId = req.user.userId;
  const { commentId } = req.params;
  const content = String(req.body.content || '').trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(commentId)) {
    return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
  }

  if (!content) {
    return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
  }

  if (content.length > 300) {
    return res.status(400).json({ success: false, message: '댓글은 300자 이하로 입력해주세요.' });
  }

  try {
    const comment = await Comment.findOne({ _id: commentId, userId });
    if (!comment) {
      return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
    }

    comment.content = content;
    await comment.save();

    return res.json({
      success: true,
      comment: {
        id: comment._id.toString(),
        surveyId: comment.surveyId.toString(),
        content: comment.content,
        created_at: comment.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '댓글 수정 중 오류가 발생했습니다.', error: error.message });
  }
}

async function deleteMyComment(req, res) {
  const userId = req.user.userId;
  const { commentId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(commentId)) {
    return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
  }

  try {
    const deleted = await Comment.deleteOne({ _id: commentId, userId });
    if (!deleted.deletedCount) {
      return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
    }

    return res.json({ success: true, deletedCommentId: commentId });
  } catch (error) {
    return res.status(500).json({ success: false, message: '댓글 삭제 중 오류가 발생했습니다.', error: error.message });
  }
}

async function deleteMySurveyResponses(req, res) {
  const userId = req.user.userId;
  const { surveyId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  try {
    const deleted = await Response.deleteMany({ surveyId, userId });
    if (!deleted.deletedCount) {
      return res.status(404).json({ success: false, message: '삭제할 참여 기록이 없습니다.' });
    }

    const survey = await Survey.findById(surveyId).select({ _id: 1, participantCount: 1 });
    if (survey) {
      survey.participantCount = Math.max(0, (Number(survey.participantCount) || 0) - 1);
      await survey.save();
    }

    return res.json({ success: true, removedCount: deleted.deletedCount || 0 });
  } catch (error) {
    return res.status(500).json({ success: false, message: '참여 기록 삭제 중 오류가 발생했습니다.', error: error.message });
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
  getSurveyResults,
  getMyParticipationStatus,
  listSurveyComments,
  createSurveyComment,
  listMyComments,
  updateMyComment,
  deleteMyComment,
  deleteMySurveyResponses
};
