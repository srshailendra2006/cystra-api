const userService = require('../services/userService');

class UserController {
  // Get all users
  async getAllUsers(req, res) {
    try {
      const users = await userService.getAllUsers();

      res.status(200).json({
        status: 'success',
        results: users.length,
        data: users
      });
    } catch (error) {
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

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

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await userService.updateUser(id, updates);

      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'User updated successfully'
      });
    } catch (error) {
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const deleted = await userService.deleteUser(id);

      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new UserController();

