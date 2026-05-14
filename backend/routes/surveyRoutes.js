const express = require('express');
const upload = require('../middlewares/upload');
const { verifyToken, softVerifyToken } = require('../middlewares/auth');
const {
  getSurveyBookmarkStatus,
  addSurveyBookmark,
  removeSurveyBookmark
} = require('../controllers/bookmarkController');
const {
  createSurvey,
  updateSurvey,
  deleteSurvey,
  listSurveys,
  getSurveyById,
  submitResponses,
  getSurveyResults,
  getMyParticipationStatus,
  listSurveyComments,
  createSurveyComment
} = require('../controllers/surveyController');

const router = express.Router();

router.get('/', listSurveys);
router.post('/', verifyToken, upload.single('surveyImage'), createSurvey);
router.get('/:surveyId', getSurveyById);
router.put('/:surveyId', verifyToken, upload.single('surveyImage'), updateSurvey);
router.delete('/:surveyId', verifyToken, deleteSurvey);
router.post('/:surveyId/responses', verifyToken, submitResponses);
router.get('/:surveyId/results', softVerifyToken, getSurveyResults);
router.get('/:surveyId/my-participation-status', verifyToken, getMyParticipationStatus);
router.get('/:surveyId/comments', listSurveyComments);
router.post('/:surveyId/comments', verifyToken, createSurveyComment);
router.get('/:surveyId/bookmark-status', verifyToken, getSurveyBookmarkStatus);
router.post('/:surveyId/bookmark', verifyToken, addSurveyBookmark);
router.delete('/:surveyId/bookmark', verifyToken, removeSurveyBookmark);

module.exports = router;
