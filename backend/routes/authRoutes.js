const express = require('express');
const { register, login, checkUserIdAvailability } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/check-userid', checkUserIdAvailability);

module.exports = router;
