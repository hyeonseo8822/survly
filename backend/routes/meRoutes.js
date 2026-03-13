const express = require('express');
const { verifyToken } = require('../middlewares/auth');
const { getMySurveys, getMyRespondedSurveys } = require('../controllers/surveyController');

const router = express.Router();

router.get('/surveys', verifyToken, getMySurveys);
router.get('/responses/surveys', verifyToken, getMyRespondedSurveys);

module.exports = router;
