const userService = require('../services/userService');

class UserController {
  /**
   * Create a new user (POST /api/v1/users)
   * Requires authentication - created_by comes from JWT token
   */
  async createUser(req, res) {
    try {
      const userData = {
        company_id: parseInt(req.body.company_id) || req.user?.company_id,
        branch_id: parseInt(req.body.branch_id) || req.user?.branch_id,
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        phone: req.body.phone,
        role_id: parseInt(req.body.role_id)
      };

      // Get created_by from JWT token (logged-in user's ID)
      const createdBy = req.user?.user_id;

      if (!createdBy) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required. Please login first.'
        });
      }

      const result = await userService.createUser(userData, createdBy);

      res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          user_id: result.user_id
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to create user'
      });
    }
  }

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

