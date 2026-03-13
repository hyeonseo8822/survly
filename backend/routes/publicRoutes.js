const express = require('express');
const { getSurveyByLink } = require('../controllers/surveyController');

const router = express.Router();

router.get('/s/:link', getSurveyByLink);

module.exports = router;
