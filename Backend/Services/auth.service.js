const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
const JWT_EXPIRES_IN = '7d'; // Token validity

const registerUser = async (data) => {
  const { firstName, lastName, email, username, password } = data;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email },
        { username: username }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('User with this email already exists.');
    } else {
      throw new Error('Username is already taken.');
    }
  }

  // 2. Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 3. Create the user (default role: VIEWER)
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      role: 'VIEWER'
    }
  });

  // 4. Generate a JWT Token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user, token };
};

const loginUser = async (email, password) => {
  // 1. Find the user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  // 2. Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  // 3. Generate a JWT Token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user, token };
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    throw new Error('User not found.');
  }

  return user;
};

const listUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      role: true,
      isVerified: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const createUserWithRole = async (data) => {
  const { firstName, lastName, email, username, password, role } = data;

  const allowedRoles = ['VIEWER', 'REP', 'ADMIN'];
  if (!allowedRoles.includes(role)) {
    throw new Error(`Invalid role. Allowed: ${allowedRoles.join(', ')}`);
  }

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });

  if (existingUser) {
    if (existingUser.email === email) throw new Error('User with this email already exists.');
    throw new Error('Username is already taken.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: { firstName, lastName, email, username, password: hashedPassword, role },
    select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true, createdAt: true }
  });
};

const deleteUser = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found.');
  if (user.role === 'SUPER_ADMIN') throw new Error('Cannot delete a Super Admin.');
  await prisma.user.delete({ where: { id } });
};

const updateUserRole = async (id, newRole, requestorRole) => {
  const allowedRoles = ['VIEWER', 'REP', 'ADMIN'];
  if (!allowedRoles.includes(newRole)) {
    throw new Error(`Invalid role. Allowed: ${allowedRoles.join(', ')}`);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error('User not found.');
  if (target.role === 'SUPER_ADMIN') throw new Error('Cannot modify a Super Admin.');

  return prisma.user.update({
    where: { id },
    data: { role: newRole },
    select: { id: true, firstName: true, lastName: true, email: true, role: true }
  });
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  listUsers,
  createUserWithRole,
  deleteUser,
  updateUserRole
};
