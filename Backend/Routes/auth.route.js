const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../Controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middlewares/auth.validation');
const { verifyToken } = require('../middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', validateRegister, register);

// POST /api/auth/login
router.post('/login', validateLogin, login);

// GET /api/auth/me
router.get('/me', verifyToken, getMe);

module.exports = router;
