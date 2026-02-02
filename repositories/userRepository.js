const { sql, getPool } = require('../db');

class UserRepository {
  /**
   * Register a new user - Simplified without is_locked
   */
  async registerUser(userData) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('company_id', sql.Int, userData.company_id)
        .input('branch_id', sql.Int, userData.branch_id)
        .input('username', sql.NVarChar(100), userData.username)
        .input('email', sql.NVarChar(255), userData.email)
        .input('password_hash', sql.NVarChar(255), userData.password_hash)
        .input('first_name', sql.NVarChar(100), userData.first_name || '')
        .input('last_name', sql.NVarChar(100), userData.last_name || '')
        .input('phone', sql.NVarChar(50), userData.phone_number || '')
        .query(`
          INSERT INTO users (company_id, branch_id, username, email, password_hash, first_name, last_name, phone)
          VALUES (@company_id, @branch_id, @username, @email, @password_hash, @first_name, @last_name, @phone);
          SELECT SCOPE_IDENTITY() AS id;
        `);

      const userId = result.recordset[0].id;

      return {
        user_id: userId,
        message: 'User registered successfully'
      };
    } catch (err) {
      throw new Error(`Error registering user: ${err.message}`);
    }
  }

  /**
   * Login user - Returns user data with role and permission_level
   */
  async loginUser(email) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('email', sql.NVarChar(255), email)
        .query(`
          SELECT 
            u.id as user_id,
            u.company_id,
            u.branch_id,
            u.username,
            u.email,
            u.password_hash,
            u.first_name,
            u.last_name,
            u.is_active,
            u.RoleID as role_id,
            r.RoleName as role_name,
            r.PermissionLevel as permission_level
          FROM users u
          LEFT JOIN Roles r ON u.RoleID = r.RoleID
          WHERE u.email = @email
        `);

      if (!result.recordset || result.recordset.length === 0) {
        throw new Error('User not found');
      }

      return result.recordset[0];
    } catch (err) {
      throw new Error(`Error during login: ${err.message}`);
    }
  }

  /**
   * Update last login time
   */
  async updateLastLogin(userId) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('user_id', sql.Int, userId)
        .query(`
          UPDATE users 
          SET last_login_at = GETDATE(), 
              updated_at = GETDATE()
          WHERE id = @user_id
        `);

      return true;
    } catch (err) {
      console.error('Error updating last login:', err.message);
      return false;
    }
  }

  /**
   * Get user by ID - Returns user data with role and permission_level
   */
  async getUserById(userId, companyId, branchId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .query(`
          SELECT 
            u.id as user_id,
            u.company_id,
            c.company_name,
            u.branch_id,
            b.branch_name,
            u.username,
            u.email,
            u.first_name,
            u.last_name,
            u.phone,
            u.RoleID as role_id,
            r.RoleName as role_name,
            r.PermissionLevel as permission_level,
            u.is_active,
            u.last_login_at,
            u.created_at,
            u.updated_at
          FROM users u
          JOIN companies c ON u.company_id = c.id
          JOIN branches b ON u.branch_id = b.id
          LEFT JOIN Roles r ON u.RoleID = r.RoleID
          WHERE u.id = @user_id 
            AND u.company_id = @company_id 
            AND u.branch_id = @branch_id
        `);

      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Error getting user by ID: ${err.message}`);
    }
  }

  /**
   * Get users by company and branch (with pagination)
   */
  async getUsersByCompanyBranch(companyId, branchId, pageNumber = 1, pageSize = 10, searchTerm = null) {
    try {
      const pool = await getPool();
      const offset = (pageNumber - 1) * pageSize;
      
      let query = `
        SELECT 
          u.id as user_id,
          u.company_id,
          c.company_name,
          u.branch_id,
          b.branch_name,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.is_active,
          u.last_login_at,
          u.created_at
        FROM users u
        JOIN companies c ON u.company_id = c.id
        JOIN branches b ON u.branch_id = b.id
        WHERE u.company_id = @company_id 
          AND u.branch_id = @branch_id
      `;

      if (searchTerm) {
        query += ` AND (u.username LIKE @search OR u.email LIKE @search OR u.first_name LIKE @search OR u.last_name LIKE @search)`;
      }

      query += `
        ORDER BY u.created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @page_size ROWS ONLY
      `;

      const request = pool.request()
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .input('offset', sql.Int, offset)
        .input('page_size', sql.Int, pageSize);

      if (searchTerm) {
        request.input('search', sql.NVarChar(255), `%${searchTerm}%`);
      }

      const result = await request.query(query);
      return result.recordset;
    } catch (err) {
      throw new Error(`Error getting users: ${err.message}`);
    }
  }

  /**
   * Find user by email (simple query for compatibility)
   */
  async findByEmail(email) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('email', sql.NVarChar(255), email)
        .query(`
          SELECT 
            id as user_id, 
            company_id, 
            branch_id, 
            username, 
            email, 
            password_hash, 
            first_name, 
            last_name, 
            is_active
          FROM users 
          WHERE email = @email
        `);
      
      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Error finding user by email: ${err.message}`);
    }
  }

  /**
   * Find user by ID (simple query for compatibility)
   */
  async findById(userId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .query(`
          SELECT 
            id as user_id,
            company_id, 
            branch_id, 
            username, 
            email, 
            first_name, 
            last_name, 
            phone, 
            is_active, 
            last_login_at, 
            created_at
          FROM users 
          WHERE id = @user_id
        `);
      
      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Error finding user by ID: ${err.message}`);
    }
  }

  /**
   * Check if a company is already registered (has users)
   */
  async isCompanyRegistered(companyId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('company_id', sql.Int, companyId)
        .query(`
          SELECT COUNT(*) as user_count
          FROM users 
          WHERE company_id = @company_id
        `);
      
      return result.recordset[0].user_count > 0;
    } catch (err) {
      throw new Error(`Error checking company registration: ${err.message}`);
    }
  }

  /**
   * Create a new user using sp_CreateUser stored procedure
   * Called when admin/manager adds a new user from dashboard
   */
  async createUser(userData) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('company_id', sql.Int, userData.company_id)
        .input('branch_id', sql.Int, userData.branch_id)
        .input('username', sql.NVarChar(50), userData.username)
        .input('email', sql.NVarChar(100), userData.email)
        .input('password_hash', sql.NVarChar(255), userData.password_hash)
        .input('first_name', sql.NVarChar(50), userData.first_name)
        .input('last_name', sql.NVarChar(50), userData.last_name || null)
        .input('phone', sql.NVarChar(20), userData.phone || null)
        .input('RoleID', sql.Int, userData.role_id)
        .input('created_by', sql.Int, userData.created_by)
        .output('user_id', sql.Int)
        .output('error_message', sql.NVarChar(500))
        .execute('sp_CreateUser');

      const userId = result.output.user_id;
      const errorMessage = result.output.error_message;

      if (!userId) {
        throw new Error(errorMessage || 'Failed to create user');
      }

      return {
        user_id: userId,
        message: errorMessage || 'User created successfully'
      };
    } catch (err) {
      throw new Error(`Error creating user: ${err.message}`);
    }
  }
}

module.exports = new UserRepository();
