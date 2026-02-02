const authService = require('../services/authService');

class AuthController {
  /**
   * Register new user with Company-Branch system
   * Accepts either company_id/branch_id OR company_name/branch_name
   */
  async register(req, res) {
    try {
      const { 
        company_id, 
        branch_id,
        company_name,
        branch_name,
        username, 
        email, 
        password, 
        first_name, 
        last_name, 
        phone_number 
      } = req.body;

      // Validation
      const hasIds = company_id && branch_id;
      const hasNames = company_name && branch_name;

      if (!hasIds && !hasNames) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide either (company_id & branch_id) OR (company_name & branch_name)'
        });
      }

      if (!username || !email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide username, email, and password'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide a valid email address'
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({
          status: 'error',
          message: 'Password must be at least 6 characters long'
        });
      }

      const result = await authService.register({
        company_id: company_id ? parseInt(company_id) : undefined,
        branch_id: branch_id ? parseInt(branch_id) : undefined,
        company_name,
        branch_name,
        username,
        email,
        password,
        first_name,
        last_name,
        phone_number
      });

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: {
            user_id: result.user_id,
            company_id: result.company_id,
            branch_id: result.branch_id,
            username: result.username,
            email: result.email
          },
          token: result.token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Login user with Company-Branch system
   */
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

      // Get IP address for logging
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.login(email, password, ipAddress);

      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Login failed'
      });
    }
  }

  /**
   * Get current user profile
   */
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
        data: {
          user
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get user profile'
      });
    }
  }
}

module.exports = new AuthController();
