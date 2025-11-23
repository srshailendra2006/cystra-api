const authService = require('../services/authService');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide all required fields'
        });
      }

      const result = await authService.register(name, email, password);

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide email and password'
        });
      }

      const result = await authService.login(email, password);

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }

      const user = await authService.getCurrentUser(token);

      res.status(200).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();

