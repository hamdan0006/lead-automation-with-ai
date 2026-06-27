const authService = require('../Services/auth.service');
const logger = require('../utils/logger');

const register = async (req, res) => {
  try {
    const { user, token } = await authService.registerUser(req.body);

    // Don't send the hashed password back
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    // Keep error messages generic for the user or pass the explicit error if it's a known conflict
    if (error.message.includes('already exists') || error.message.includes('taken')) {
      return res.status(409).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during registration.'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);

    // Don't send the hashed password back
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);

    if (error.message === 'Invalid email or password.') {
      return res.status(401).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during login.'
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    logger.error(`GetMe error: ${error.message}`);
    res.status(404).json({ success: false, message: 'User not found.' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await authService.listUsers();
    res.status(200).json({ success: true, users });
  } catch (error) {
    logger.error(`GetUsers error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

const createUser = async (req, res) => {
  try {
    const user = await authService.createUserWithRole(req.body);
    res.status(201).json({ success: true, message: 'User created successfully.', user });
  } catch (error) {
    logger.error(`CreateUser error: ${error.message}`);
    if (error.message.includes('already exists') || error.message.includes('taken')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.message.includes('Invalid role')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
};

const removeUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    await authService.deleteUser(id);
    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    logger.error(`DeleteUser error: ${error.message}`);
    if (error.message === 'User not found.') return res.status(404).json({ success: false, message: error.message });
    if (error.message.includes('Cannot delete')) return res.status(403).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    const { role } = req.body;
    if (!role) return res.status(400).json({ success: false, message: 'Role is required.' });
    const user = await authService.updateUserRole(id, role, req.user.role);
    res.status(200).json({ success: true, message: 'Role updated successfully.', user });
  } catch (error) {
    logger.error(`ChangeRole error: ${error.message}`);
    if (error.message === 'User not found.') return res.status(404).json({ success: false, message: error.message });
    if (error.message.includes('Cannot modify') || error.message.includes('Invalid role')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getUsers,
  createUser,
  removeUser,
  changeUserRole
};
