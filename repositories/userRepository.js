const db = require('../db');

class UserRepository {
  // Create new user
  async create(userData) {
    const { name, email, password } = userData;
    const sql = `
      INSERT INTO users (name, email, password) 
      OUTPUT INSERTED.id
      VALUES (@name, @email, @password)
    `;
    const result = await db.executeQueryWithParams(sql, { name, email, password });
    return result[0].id;
  }

  // Find user by email
  async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = @email';
    const results = await db.executeQueryWithParams(sql, { email });
    return results[0];
  }

  // Find user by ID
  async findById(id) {
    const sql = 'SELECT id, name, email, created_at FROM users WHERE id = @id';
    const results = await db.executeQueryWithParams(sql, { id });
    return results[0];
  }

  // Find all users
  async findAll() {
    const sql = 'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC';
    const results = await db.executeQuery(sql);
    return results;
  }

  // Update user
  async update(id, updates) {
    const fields = [];
    const params = { id };

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        params[key] = updates[key];
      }
    });

    if (fields.length === 0) return false;

    // Add updated_at
    fields.push('updated_at = GETDATE()');

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = @id`;
    const pool = await db.getPool();
    const request = pool.request();
    
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(sql);
    return result.rowsAffected[0] > 0;
  }

  // Delete user
  async delete(id) {
    const sql = 'DELETE FROM users WHERE id = @id';
    const pool = await db.getPool();
    const request = pool.request();
    request.input('id', id);
    const result = await request.query(sql);
    return result.rowsAffected[0] > 0;
  }
}

module.exports = new UserRepository();

