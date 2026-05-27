const mongoose = require('mongoose');
const Question = require('../models/Question');
const Option = require('../models/Option');
const { resolveUploadDataUrl } = require('./uploadResolver');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseQuestionsPayload(rawQuestions) {
  if (Array.isArray(rawQuestions)) {
    return rawQuestions;
  }

  try {
    const parsed = JSON.parse(rawQuestions);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

async function toSurveyResponse(survey) {
  return {
    id: survey._id.toString(),
    title: survey.title,
    description: survey.description,
    embedUrl: survey.embedUrl || '',
    isPublic: survey.isPublic,
    responseTabPublic: survey.responseTabPublic,
    userId: survey.userId,
    link: survey.link,
    img: survey.img === 'default_img' ? 'default_img' : await resolveUploadDataUrl(survey.img || ''),
    participantCount: survey.participantCount || 0,
    created_at: survey.created_at
  };
}

function toQuestionResponse(question, options) {
  return {
    questionId: question._id.toString(),
    type: question.type,
    question: question.question,
    isRequired: question.isRequired ? 1 : 0,
    options
  };
}

async function getSurveyDetails(surveyDoc) {
  const questions = await Question.find({ surveyId: surveyDoc._id }).sort({ _id: 1 }).lean();
  const questionIds = questions.map((question) => question._id);
  const options = questionIds.length > 0
    ? await Option.find({ questionId: { $in: questionIds } }).sort({ _id: 1 }).lean()
    : [];

  const optionsByQuestionId = new Map();
  options.forEach((option) => {
    const key = option.questionId.toString();
    if (!optionsByQuestionId.has(key)) {
      optionsByQuestionId.set(key, []);
    }
    optionsByQuestionId.get(key).push(option.optionText);
  });

  return {
    ...await toSurveyResponse(surveyDoc),
    questions: questions.map((question) => toQuestionResponse(
      question,
      optionsByQuestionId.get(question._id.toString()) || []
    ))
  };
}

module.exports = {
  isValidObjectId,
  parseQuestionsPayload,
  normalizeBoolean,
  toSurveyResponse,
  getSurveyDetails
};
