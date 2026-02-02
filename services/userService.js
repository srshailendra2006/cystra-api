const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

class UserService {
  /**
   * Create a new user (called from dashboard "Add User")
   * - Validates input
   * - Hashes password
   * - Calls repository to create user via sp_CreateUser
   */
  async createUser(userData, createdBy) {
    try {
      // Validate required fields
      if (!userData.company_id || !userData.branch_id) {
        const error = new Error('Company ID and Branch ID are required');
        error.status = 400;
        throw error;
      }

      if (!userData.username || !userData.email || !userData.password) {
        const error = new Error('Username, email, and password are required');
        error.status = 400;
        throw error;
      }

      if (!userData.first_name) {
        const error = new Error('First name is required');
        error.status = 400;
        throw error;
      }

      if (!userData.role_id) {
        const error = new Error('Role ID is required');
        error.status = 400;
        throw error;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        const error = new Error('Please provide a valid email address');
        error.status = 400;
        throw error;
      }

      // Validate password length
      if (userData.password.length < 6) {
        const error = new Error('Password must be at least 6 characters long');
        error.status = 400;
        throw error;
      }

      // Check if email already exists
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        const error = new Error('User with this email already exists');
        error.status = 400;
        throw error;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(userData.password, salt);

      // Create user via stored procedure
      const result = await userRepository.createUser({
        company_id: userData.company_id,
        branch_id: userData.branch_id,
        username: userData.username,
        email: userData.email,
        password_hash: password_hash,
        first_name: userData.first_name,
        last_name: userData.last_name || null,
        phone: userData.phone || null,
        role_id: userData.role_id,
        created_by: createdBy
      });

      return {
        user_id: result.user_id,
        message: 'User created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all users
  async getAllUsers() {
    try {
      return await userRepository.findAll();
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(id) {
    try {
      return await userRepository.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(id, updates) {
    try {
      // Remove sensitive fields that shouldn't be updated directly
      delete updates.password;
      delete updates.id;

      return await userRepository.update(id, updates);
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  async deleteUser(id) {
    try {
      return await userRepository.delete(id);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();

