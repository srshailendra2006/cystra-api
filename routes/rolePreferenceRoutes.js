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

function enforceAdmin(req) {
  const permission = req.user?.permission_level ?? 10;
  if (permission < 50) {
    const err = new Error('Forbidden (admin only)');
    err.status = 403;
    throw err;
  }
}

/**
 * @swagger
 * /api/v1/role-preferences:
 *   get:
 *     summary: Get a role preference (role default)
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role_id
 *         required: true
 *         schema: { type: integer }
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
 *         description: Preference (or null)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    enforceAdmin(req);

    const role_id = toInt(req.query.role_id);
    const company_id = toInt(req.query.company_id) ?? req.user?.company_id ?? null;
    const branch_id = toInt(req.query.branch_id);
    const pref_key = (req.query.pref_key || '').trim();

    if (!role_id) return res.status(400).json({ status: 'error', message: 'role_id is required' });
    if (!company_id) return res.status(400).json({ status: 'error', message: 'company_id is required' });
    if (!pref_key) return res.status(400).json({ status: 'error', message: 'pref_key is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('RoleID', sql.Int, role_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .query(`
        SELECT TOP 1
          PrefKey as pref_key,
          PrefValueJson as pref_value_json,
          BranchID as branch_id
        FROM dbo.RolePreferences
        WHERE IsActive = 1
          AND RoleID = @RoleID
          AND CompanyID = @CompanyID
          AND PrefKey = @PrefKey
          AND (
            (@BranchID IS NULL AND BranchID IS NULL)
            OR (@BranchID IS NOT NULL AND BranchID = @BranchID)
          )
        ORDER BY RolePreferenceID DESC
      `);

    const row = result.recordset?.[0] || null;
    return res.status(200).json({
      status: 'success',
      data: row
        ? {
            pref_key: row.pref_key,
            branch_id: row.branch_id ?? null,
            pref_value_json: row.pref_value_json,
            pref_value: parsePrefValueJson(row.pref_value_json)
          }
        : null
    });
  } catch (error) {
    console.error('Error getting role preference:', error);
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to get role preference'
    });
  }
});

/**
 * @swagger
 * /api/v1/role-preferences:
 *   put:
 *     summary: Save/update a role preference (role default)
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_id, company_id, pref_key, pref_value]
 *             properties:
 *               role_id: { type: integer }
 *               company_id: { type: integer }
 *               branch_id: { type: integer, nullable: true }
 *               pref_key: { type: string }
 *               pref_value:
 *                 description: Stored as JSON in PrefValueJson
 *                 oneOf:
 *                   - type: array
 *                     items: { type: string }
 *                   - type: object
 *     responses:
 *       200:
 *         description: Saved
 */
router.put('/', authenticate, async (req, res) => {
  try {
    enforceAdmin(req);

    const role_id = toInt(req.body.role_id);
    const company_id = toInt(req.body.company_id) ?? req.user?.company_id ?? null;
    const branch_id = toInt(req.body.branch_id);
    const pref_key = (req.body.pref_key || '').trim();
    const pref_value = req.body.pref_value;
    const updated_by = req.user?.user_id ?? null;

    if (!role_id) return res.status(400).json({ status: 'error', message: 'role_id is required' });
    if (!company_id) return res.status(400).json({ status: 'error', message: 'company_id is required' });
    if (!pref_key) return res.status(400).json({ status: 'error', message: 'pref_key is required' });
    if (pref_value === undefined) return res.status(400).json({ status: 'error', message: 'pref_value is required' });

    const pref_value_json = typeof pref_value === 'string' ? pref_value : JSON.stringify(pref_value);
    const pool = await getPool();

    await pool.request()
      .input('RoleID', sql.Int, role_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .input('PrefValueJson', sql.NVarChar(sql.MAX), pref_value_json)
      .input('UpdatedBy', sql.Int, updated_by)
      .query(`
        DECLARE @Updated INT = 0;

        UPDATE dbo.RolePreferences
        SET PrefValueJson = @PrefValueJson,
            UpdatedOn = SYSDATETIME(),
            UpdatedBy = @UpdatedBy,
            IsActive = 1
        WHERE IsActive = 1
          AND RoleID = @RoleID
          AND CompanyID = @CompanyID
          AND PrefKey = @PrefKey
          AND (
            (@BranchID IS NULL AND BranchID IS NULL)
            OR (@BranchID IS NOT NULL AND BranchID = @BranchID)
          );

        SET @Updated = @@ROWCOUNT;

        IF (@Updated = 0)
        BEGIN
          INSERT INTO dbo.RolePreferences (
            RoleID, CompanyID, BranchID, PrefKey, PrefValueJson,
            IsActive, CreatedOn, CreatedBy
          )
          VALUES (
            @RoleID, @CompanyID, @BranchID, @PrefKey, @PrefValueJson,
            1, SYSDATETIME(), @UpdatedBy
          );
        END

        SELECT 1 AS ok;
      `);

    return res.status(200).json({
      status: 'success',
      message: 'Role preference saved',
      data: { role_id, pref_key, branch_id: branch_id ?? null, pref_value }
    });
  } catch (error) {
    console.error('Error saving role preference:', error);
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to save role preference'
    });
  }
});

/**
 * @swagger
 * /api/v1/role-preferences:
 *   delete:
 *     summary: Delete/reset a role preference
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role_id
 *         required: true
 *         schema: { type: integer }
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
 *         description: Deleted/reset
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    enforceAdmin(req);

    const role_id = toInt(req.query.role_id);
    const company_id = toInt(req.query.company_id) ?? req.user?.company_id ?? null;
    const branch_id = toInt(req.query.branch_id);
    const pref_key = (req.query.pref_key || '').trim();
    const updated_by = req.user?.user_id ?? null;

    if (!role_id) return res.status(400).json({ status: 'error', message: 'role_id is required' });
    if (!company_id) return res.status(400).json({ status: 'error', message: 'company_id is required' });
    if (!pref_key) return res.status(400).json({ status: 'error', message: 'pref_key is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('RoleID', sql.Int, role_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .input('UpdatedBy', sql.Int, updated_by)
      .query(`
        UPDATE dbo.RolePreferences
        SET IsActive = 0,
            UpdatedOn = SYSDATETIME(),
            UpdatedBy = @UpdatedBy
        WHERE IsActive = 1
          AND RoleID = @RoleID
          AND CompanyID = @CompanyID
          AND PrefKey = @PrefKey
          AND (
            (@BranchID IS NULL AND BranchID IS NULL)
            OR (@BranchID IS NOT NULL AND BranchID = @BranchID)
          );
        SELECT @@ROWCOUNT AS affected;
      `);

    return res.status(200).json({
      status: 'success',
      message: 'Role preference reset',
      data: { affected: result.recordset?.[0]?.affected || 0 }
    });
  } catch (error) {
    console.error('Error deleting role preference:', error);
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to delete role preference'
    });
  }
});

module.exports = router;


