const express = require('express');
const { softVerifyToken, verifyToken } = require('../middlewares/auth');
const {
	getUserProfile,
	getUserSurveys,
	getUserRespondedSurveys,
	followUser,
	unfollowUser,
	listFollowers,
	listFollowing,
	searchUsers
} = require('../controllers/profileController');

const router = express.Router();

router.get('/search', softVerifyToken, searchUsers);
router.get('/:userId/profile', softVerifyToken, getUserProfile);
router.get('/:userId/surveys', softVerifyToken, getUserSurveys);
router.get('/:userId/responded-surveys', softVerifyToken, getUserRespondedSurveys);
router.get('/:userId/followers', softVerifyToken, listFollowers);
router.get('/:userId/following', softVerifyToken, listFollowing);
router.post('/:userId/follow', verifyToken, followUser);
router.delete('/:userId/follow', verifyToken, unfollowUser);

module.exports = router;
