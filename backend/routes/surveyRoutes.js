const express = require('express');
const upload = require('../middlewares/upload');
const { verifyToken, softVerifyToken } = require('../middlewares/auth');
const {
  createSurvey,
  updateSurvey,
  deleteSurvey,
  listSurveys,
  getSurveyById,
  submitResponses,
  getSurveyResults
} = require('../controllers/surveyController');

const router = express.Router();

router.get('/', listSurveys);
router.post('/', verifyToken, upload.single('surveyImage'), createSurvey);
router.get('/:surveyId', getSurveyById);
router.put('/:surveyId', verifyToken, upload.single('surveyImage'), updateSurvey);
router.delete('/:surveyId', verifyToken, deleteSurvey);
router.post('/:surveyId/responses', softVerifyToken, submitResponses);
router.get('/:surveyId/results', verifyToken, getSurveyResults);

module.exports = router;
