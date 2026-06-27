const AuthService = require('../services/authService');

const AuthController = {
  async register(req, res, next) {
    try {
      const { name, email, password, role, matric_number, department, supervisor_id } = req.body;
      const { user, token } = await AuthService.register({ name, email, password, role, matric_number, department, supervisor_id });
      res.status(201).json({ status: 'success', data: { user, token } });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, matric_number, password } = req.body;
      const { user, token } = await AuthService.login({ email, matric_number, password });
      res.json({ status: 'success', data: { user, token } });
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req, res, next) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      res.json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const user = await AuthService.updateProfile(req.user.id, req.body);
      res.json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      await AuthService.changePassword(req.user.id, req.body);
      res.json({ status: 'success', message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getHods(req, res, next) {
    try {
      const hods = await AuthService.getHods();
      res.json({ status: 'success', data: { hods } });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
