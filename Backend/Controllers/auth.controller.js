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

module.exports = {
  register,
  login,
  getMe
};
