const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
  // Register new user
  async register(name, email, password) {
    try {
      // Check if user exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        const error = new Error('User with this email already exists');
        error.status = 400;
        throw error;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const userId = await userRepository.create({
        name,
        email,
        password: hashedPassword
      });

      // Generate token
      const token = this.generateToken(userId);

      return {
        userId,
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user
      const user = await userRepository.findByEmail(email);
      if (!user) {
        const error = new Error('Invalid credentials');
        error.status = 401;
        throw error;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const error = new Error('Invalid credentials');
        error.status = 401;
        throw error;
      }

      // Generate token
      const token = this.generateToken(user.id);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Get current user from token
  async getCurrentUser(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await userRepository.findById(decoded.id);

      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        const err = new Error('Invalid token');
        err.status = 401;
        throw err;
      }
      throw error;
    }
  }

  // Generate JWT token
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }
}

module.exports = new AuthService();

