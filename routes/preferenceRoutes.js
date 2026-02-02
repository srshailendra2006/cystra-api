const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function parsePrefValueJson(prefValueJson) {
  if (prefValueJson === null || prefValueJson === undefined) return null;
  try {
    return JSON.parse(prefValueJson);
  } catch (_) {
    return prefValueJson;
  }
}

async function getUserPref({ pool, user_id, company_id, branch_id, pref_key }) {
  // Prefer branch-specific, then company-wide (BranchID NULL)
  if (branch_id !== null && branch_id !== undefined) {
    const r1 = await pool.request()
      .input('UserID', sql.Int, user_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .query(`
        SELECT TOP 1 PrefValueJson
        FROM dbo.UserPreferences
        WHERE IsActive = 1
          AND UserID = @UserID
          AND CompanyID = @CompanyID
          AND BranchID = @BranchID
          AND PrefKey = @PrefKey
        ORDER BY PreferenceID DESC
      `);
    if (r1.recordset?.[0]?.PrefValueJson) return r1.recordset[0].PrefValueJson;
  }

  const r2 = await pool.request()
    .input('UserID', sql.Int, user_id)
    .input('CompanyID', sql.Int, company_id)
    .input('PrefKey', sql.NVarChar(100), pref_key)
    .query(`
      SELECT TOP 1 PrefValueJson
      FROM dbo.UserPreferences
      WHERE IsActive = 1
        AND UserID = @UserID
        AND CompanyID = @CompanyID
        AND BranchID IS NULL
        AND PrefKey = @PrefKey
      ORDER BY PreferenceID DESC
    `);
  return r2.recordset?.[0]?.PrefValueJson ?? null;
}

async function getRolePref({ pool, role_id, company_id, branch_id, pref_key }) {
  if (!role_id) return null;

  // Prefer branch-specific, then company-wide (BranchID NULL)
  if (branch_id !== null && branch_id !== undefined) {
    const r1 = await pool.request()
      .input('RoleID', sql.Int, role_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .query(`
        SELECT TOP 1 PrefValueJson
        FROM dbo.RolePreferences
        WHERE IsActive = 1
          AND RoleID = @RoleID
          AND CompanyID = @CompanyID
          AND BranchID = @BranchID
          AND PrefKey = @PrefKey
        ORDER BY RolePreferenceID DESC
      `);
    if (r1.recordset?.[0]?.PrefValueJson) return r1.recordset[0].PrefValueJson;
  }

  const r2 = await pool.request()
    .input('RoleID', sql.Int, role_id)
    .input('CompanyID', sql.Int, company_id)
    .input('PrefKey', sql.NVarChar(100), pref_key)
    .query(`
      SELECT TOP 1 PrefValueJson
      FROM dbo.RolePreferences
      WHERE IsActive = 1
        AND RoleID = @RoleID
        AND CompanyID = @CompanyID
        AND BranchID IS NULL
        AND PrefKey = @PrefKey
      ORDER BY RolePreferenceID DESC
    `);
  return r2.recordset?.[0]?.PrefValueJson ?? null;
}

/**
 * @swagger
 * /api/v1/preferences/effective:
 *   get:
 *     summary: Get effective preference (user override -> role default -> app default)
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: branch_id
 *         required: false
 *         schema: { type: integer, nullable: true }
 *       - in: query
 *         name: pref_key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Effective preference value and source
 */
router.get('/effective', authenticate, async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    const role_id = req.user?.role_id ?? null;
    const company_id = toInt(req.query.company_id) ?? req.user?.company_id ?? null;
    const branch_id = toInt(req.query.branch_id) ?? req.user?.branch_id ?? null;
    const pref_key = (req.query.pref_key || '').trim();

    if (!user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    if (!company_id) return res.status(400).json({ status: 'error', message: 'company_id is required' });
    if (!pref_key) return res.status(400).json({ status: 'error', message: 'pref_key is required' });

    const pool = await getPool();

    const userJson = await getUserPref({ pool, user_id, company_id, branch_id, pref_key });
    if (userJson !== null && userJson !== undefined) {
      return res.status(200).json({
        status: 'success',
        data: {
          pref_key,
          pref_value: parsePrefValueJson(userJson) ?? [],
          source: 'user'
        }
      });
    }

    const roleJson = await getRolePref({ pool, role_id, company_id, branch_id, pref_key });
    if (roleJson !== null && roleJson !== undefined) {
      return res.status(200).json({
        status: 'success',
        data: {
          pref_key,
          pref_value: parsePrefValueJson(roleJson) ?? [],
          source: 'role'
        }
      });
    }

    // App default (unknown): return empty array for safe UI handling
    return res.status(200).json({
      status: 'success',
      data: {
        pref_key,
        pref_value: [],
        source: 'default'
      }
    });
  } catch (error) {
    console.error('Error fetching effective preference:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch effective preference' });
  }
});

module.exports = router;


