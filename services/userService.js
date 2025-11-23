const userRepository = require('../repositories/userRepository');

class UserService {
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

