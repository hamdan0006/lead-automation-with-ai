const validator = require('validator');

const validateRegister = (req, res, next) => {
  const body = req.body || {};
  let { firstName, lastName, email, username, password } = body;

  firstName = typeof firstName === 'string' ? firstName : '';
  lastName = typeof lastName === 'string' ? lastName : '';
  username = typeof username === 'string' ? username : '';
  email = typeof email === 'string' ? email : '';
  password = typeof password === 'string' ? password : '';

  if (validator.isEmpty(firstName.trim())) {
    return res.status(400).json({ success: false, message: 'First name is required.' });
  }

  if (validator.isEmpty(lastName.trim())) {
    return res.status(400).json({ success: false, message: 'Last name is required.' });
  }

  if (!validator.isLength(username.trim(), { min: 3 })) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (!validator.isLength(password, { min: 8 })) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const body = req.body || {};
  let { email, password } = body;

  email = typeof email === 'string' ? email : '';
  password = typeof password === 'string' ? password : '';

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (validator.isEmpty(password)) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin
};
