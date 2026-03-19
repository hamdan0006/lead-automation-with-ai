const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // Assuming Gmail since "app password" is common there
  auth: {
    user: process.env.SMTP_EMAIL || 'your-email@gmail.com', // USER MUST ADD THIS
    pass: process.env.App_Pass,
  },
});

module.exports = transporter;
