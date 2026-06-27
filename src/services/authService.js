const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const AuthService = {
  async register({ name, email, password, role, matric_number, department, supervisor_id }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ name, email, password: hashedPassword, role, matric_number, department, supervisor_id });
    const token = signToken({ id: user.id, role: user.role });

    return { user, token };
  },

  async login({ email, matric_number, password }) {
    let user;
    if (email) {
      user = await UserModel.findByEmail(email);
    } else if (matric_number) {
      // Find by matric number
      const { query } = require('../config/database');
      const res = await query('SELECT * FROM users WHERE matric_number = $1', [matric_number]);
      user = res.rows[0];
    }

    if (!user) {
      throw new AppError('Invalid credentials. Check your email/matric number and password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Remove password from returned user object
    const { password: _pw, ...safeUser } = user;
    const token = signToken({ id: safeUser.id, role: safeUser.role });

    return { user: safeUser, token };
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const userById = await UserModel.findById(userId);
    if (!userById) throw new AppError('User not found', 404);
    const user = await UserModel.findByEmail(userById.email);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(userId, hashed);
  },

  async getProfile(userId) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async updateProfile(userId, fields) {
    const user = await UserModel.update(userId, fields);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async getHods() {
    return UserModel.findAllHods();
  },
};

module.exports = AuthService;
