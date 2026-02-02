const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: Get roles for user creation
 *     tags: [Users]
 *     description: Returns available roles. Tries `Roles` table first, falls back to `user_roles`.
 *     responses:
 *       200:
 *         description: Roles list
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    // Primary: Roles table (used by existing queries in repositories/userRepository.js)
    try {
      const result = await pool.request().query(`
        SELECT
          RoleID as role_id,
          RoleName as role_name,
          PermissionLevel as permission_level
        FROM Roles
        ORDER BY PermissionLevel ASC, RoleName ASC
      `);

      return res.status(200).json({
        status: 'success',
        data: result.recordset
      });
    } catch (err) {
      // Fallback: user_roles table (from db/user_signup_enhanced.sql)
      const result = await pool.request().query(`
        SELECT
          id as role_id,
          role_name,
          NULL as permission_level
        FROM user_roles
        WHERE is_active = 1
        ORDER BY role_name ASC
      `);

      return res.status(200).json({
        status: 'success',
        data: result.recordset
      });
    }
  } catch (error) {
    console.error('Error fetching roles:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch roles'
    });
  }
});

module.exports = router;


