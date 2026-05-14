const express = require('express');
const { verifyToken } = require('../middlewares/auth');
const {
	getMySurveys,
	getMyRespondedSurveys,
	listMyComments,
	updateMyComment,
	deleteMyComment,
	deleteMySurveyResponses
} = require('../controllers/surveyController');
const { getMyProfile, updateMyProfile } = require('../controllers/profileController');
const {
	listMyBookmarkLists,
	createBookmarkList,
	updateBookmarkList,
	deleteBookmarkList,
	listBookmarkedSurveysInList
} = require('../controllers/bookmarkController');
const upload = require('../middlewares/upload');

const router = express.Router();

router.get('/profile', verifyToken, getMyProfile);
router.put('/profile', verifyToken, upload.single('avatar'), updateMyProfile);
router.get('/surveys', verifyToken, getMySurveys);
router.get('/responses/surveys', verifyToken, getMyRespondedSurveys);
router.delete('/responses/surveys/:surveyId', verifyToken, deleteMySurveyResponses);
router.get('/comments', verifyToken, listMyComments);
router.patch('/comments/:commentId', verifyToken, updateMyComment);
router.delete('/comments/:commentId', verifyToken, deleteMyComment);
router.get('/bookmark-lists', verifyToken, listMyBookmarkLists);
router.post('/bookmark-lists', verifyToken, createBookmarkList);
router.patch('/bookmark-lists/:listId', verifyToken, updateBookmarkList);
router.delete('/bookmark-lists/:listId', verifyToken, deleteBookmarkList);
router.get('/bookmark-lists/:listId/surveys', verifyToken, listBookmarkedSurveysInList);

module.exports = router;
