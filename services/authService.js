const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
  /**
   * Register new user with Company-Branch system
   * Accepts either company_id/branch_id OR company_name/branch_name
   */
  async register(userData) {
    try {
      let { 
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
      } = userData;

      // Validate required fields
      const hasIds = company_id && branch_id;
      const hasNames = company_name && branch_name;
      
      if (!hasIds && !hasNames) {
        const error = new Error('Either (company_id & branch_id) OR (company_name & branch_name) are required');
        error.status = 400;
        throw error;
      }

      if (!username || !email || !password) {
        const error = new Error('Username, Email, and Password are required');
        error.status = 400;
        throw error;
      }

      // If names provided, look up IDs
      if (!hasIds && hasNames) {
        const { sql, getPool } = require('../db');
        const pool = await getPool();

        // Lookup company by name
        const companyResult = await pool.request()
          .input('company_name', sql.NVarChar(255), company_name)
          .query('SELECT id FROM companies WHERE company_name = @company_name AND is_active = 1');
        
        if (!companyResult.recordset || companyResult.recordset.length === 0) {
          const error = new Error(`Company '${company_name}' not found`);
          error.status = 404;
          throw error;
        }
        company_id = companyResult.recordset[0].id;

        // Lookup branch by name and company
        const branchResult = await pool.request()
          .input('branch_name', sql.NVarChar(255), branch_name)
          .input('company_id', sql.Int, company_id)
          .query('SELECT id FROM branches WHERE branch_name = @branch_name AND company_id = @company_id AND is_active = 1');
        
        if (!branchResult.recordset || branchResult.recordset.length === 0) {
          const error = new Error(`Branch '${branch_name}' not found for company '${company_name}'`);
          error.status = 404;
          throw error;
        }
        branch_id = branchResult.recordset[0].id;
      }

      // Check if company is already registered in the system
      const isCompanyRegistered = await userRepository.isCompanyRegistered(company_id);
      if (isCompanyRegistered) {
        const error = new Error('This company is already registered with the system. Please contact the company administrator for access.');
        error.status = 400;
        throw error;
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        const error = new Error('User with this email already exists');
        error.status = 400;
        throw error;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Register user using stored procedure
      const result = await userRepository.registerUser({
        company_id,
        branch_id,
        username,
        email,
        password_hash,
        first_name,
        last_name,
        phone_number
      });

      // Generate JWT token with company and branch info
      const token = this.generateToken({
        user_id: result.user_id,
        company_id,
        branch_id,
        email
      });

      return {
        user_id: result.user_id,
        company_id,
        branch_id,
        username,
        email,
        token,
        message: 'User registered successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user with Company-Branch system
   */
  async login(email, password, ipAddress = null) {
    try {
      // Validate inputs
      if (!email || !password) {
        const error = new Error('Email and password are required');
        error.status = 400;
        throw error;
      }

      // Get user data
      let userData;
      try {
        userData = await userRepository.loginUser(email);
      } catch (err) {
        const error = new Error('Invalid credentials');
        error.status = 401;
        throw error;
      }

      // Check if account is active
      if (!userData.is_active) {
        const error = new Error('Account is inactive. Please contact administrator.');
        error.status = 403;
        throw error;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, userData.password_hash);
      if (!isMatch) {
        const error = new Error('Invalid credentials');
        error.status = 401;
        throw error;
      }

      // Update last login time
      await userRepository.updateLastLogin(userData.user_id);

      // Get full user details
      const userDetails = await userRepository.getUserById(
        userData.user_id,
        userData.company_id,
        userData.branch_id
      );

      // Generate JWT token with role and permission info
      const token = this.generateToken({
        user_id: userData.user_id,
        company_id: userData.company_id,
        branch_id: userData.branch_id,
        email: userDetails.email,
        role_id: userDetails.role_id,
        role_name: userDetails.role_name || 'User',
        permission_level: userDetails.permission_level || 10
      });

      return {
        user: {
          user_id: userDetails.user_id,
          company_id: userDetails.company_id,
          company_name: userDetails.company_name,
          branch_id: userDetails.branch_id,
          branch_name: userDetails.branch_name,
          username: userDetails.username,
          email: userDetails.email,
          first_name: userDetails.first_name,
          last_name: userDetails.last_name,
          phone_number: userDetails.phone,
          role_id: userDetails.role_id,
          role_name: userDetails.role_name || 'User',
          permission_level: userDetails.permission_level || 10
        },
        token,
        message: 'Login successful'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(token) {
    try {
      // Verify and decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Get user details
      const user = await userRepository.getUserById(
        decoded.user_id,
        decoded.company_id,
        decoded.branch_id
      );

      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      return {
        user_id: user.user_id,
        company_id: user.company_id,
        company_name: user.company_name,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        is_active: user.is_active,
        last_login_at: user.last_login_at
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        const err = new Error('Invalid token');
        err.status = 401;
        throw err;
      }
      if (error.name === 'TokenExpiredError') {
        const err = new Error('Token expired');
        err.status = 401;
        throw err;
      }
      throw error;
    }
  }

  /**
   * Generate JWT token with company and branch info
   */
  generateToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }
}

module.exports = new AuthService();
