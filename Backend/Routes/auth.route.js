const express = require('express');
const router = express.Router();
const { register, login, getMe, getUsers, createUser, removeUser, changeUserRole } = require('../Controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middlewares/auth.validation');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Authenticated routes
router.get('/me', verifyToken, getMe);

// Admin / Super Admin only — user management
const adminGuard = [verifyToken, requireRole('ADMIN', 'SUPER_ADMIN')];

router.get('/users', ...adminGuard, getUsers);
router.post('/users', ...adminGuard, validateRegister, createUser);
router.delete('/users/:id', ...adminGuard, removeUser);
router.patch('/users/:id/role', ...adminGuard, changeUserRole);

module.exports = router;
