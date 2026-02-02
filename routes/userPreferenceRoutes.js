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

/**
 * @swagger
 * tags:
 *   name: Preferences
 *   description: User/Role preferences for UI (columns favorites, etc.)
 */

/**
 * @swagger
 * /api/v1/user-preferences:
 *   get:
 *     summary: Get a user preference (personal override)
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
 *         description: Optional (NULL applies to all branches in company)
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
    const user_id = req.user?.user_id;
    const company_id = toInt(req.query.company_id) ?? req.user?.company_id ?? null;
    const branch_id = toInt(req.query.branch_id);
    const pref_key = (req.query.pref_key || '').trim();

    if (!user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    if (!company_id) return res.status(400).json({ status: 'error', message: 'company_id is required' });
    if (!pref_key) return res.status(400).json({ status: 'error', message: 'pref_key is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, user_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .query(`
        SELECT TOP 1
          PrefKey as pref_key,
          PrefValueJson as pref_value_json,
          BranchID as branch_id
        FROM dbo.UserPreferences
        WHERE IsActive = 1
          AND UserID = @UserID
          AND CompanyID = @CompanyID
          AND PrefKey = @PrefKey
          AND (
            (@BranchID IS NULL AND BranchID IS NULL)
            OR (@BranchID IS NOT NULL AND BranchID = @BranchID)
          )
        ORDER BY PreferenceID DESC
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
    console.error('Error getting user preference:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to get user preference' });
  }
});

/**
 * @swagger
 * /api/v1/user-preferences:
 *   put:
 *     summary: Save/update a user preference (personal override)
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, pref_key, pref_value]
 *             properties:
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
    const user_id = req.user?.user_id;
    const company_id = toInt(req.body.company_id) ?? req.user?.company_id ?? null;
    const branch_id = toInt(req.body.branch_id);
    const pref_key = (req.body.pref_key || '').trim();
    const pref_value = req.body.pref_value;

    if (!user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    if (!company_id) return res.status(400).json({ status: 'error', message: 'company_id is required' });
    if (!pref_key) return res.status(400).json({ status: 'error', message: 'pref_key is required' });
    if (pref_value === undefined) return res.status(400).json({ status: 'error', message: 'pref_value is required' });

    const pref_value_json = typeof pref_value === 'string' ? pref_value : JSON.stringify(pref_value);
    const pool = await getPool();

    // Upsert: update if exists (active), else insert
    const result = await pool.request()
      .input('UserID', sql.Int, user_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .input('PrefValueJson', sql.NVarChar(sql.MAX), pref_value_json)
      .input('UpdatedBy', sql.Int, user_id)
      .query(`
        DECLARE @Updated INT = 0;

        UPDATE dbo.UserPreferences
        SET PrefValueJson = @PrefValueJson,
            UpdatedOn = SYSDATETIME(),
            UpdatedBy = @UpdatedBy,
            IsActive = 1
        WHERE IsActive = 1
          AND UserID = @UserID
          AND CompanyID = @CompanyID
          AND PrefKey = @PrefKey
          AND (
            (@BranchID IS NULL AND BranchID IS NULL)
            OR (@BranchID IS NOT NULL AND BranchID = @BranchID)
          );

        SET @Updated = @@ROWCOUNT;

        IF (@Updated = 0)
        BEGIN
          INSERT INTO dbo.UserPreferences (
            UserID, CompanyID, BranchID, PrefKey, PrefValueJson,
            IsActive, CreatedOn, CreatedBy
          )
          VALUES (
            @UserID, @CompanyID, @BranchID, @PrefKey, @PrefValueJson,
            1, SYSDATETIME(), @UpdatedBy
          );
        END

        SELECT 1 AS ok;
      `);

    return res.status(200).json({
      status: 'success',
      message: 'User preference saved',
      data: { pref_key, branch_id: branch_id ?? null, pref_value }
    });
  } catch (error) {
    console.error('Error saving user preference:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to save user preference' });
  }
});

/**
 * @swagger
 * /api/v1/user-preferences:
 *   delete:
 *     summary: Delete/reset a user preference (falls back to role/default)
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
 *         description: Deleted/reset
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    const company_id = toInt(req.query.company_id) ?? req.user?.company_id ?? null;
    const branch_id = toInt(req.query.branch_id);
    const pref_key = (req.query.pref_key || '').trim();

    if (!user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    if (!company_id) return res.status(400).json({ status: 'error', message: 'company_id is required' });
    if (!pref_key) return res.status(400).json({ status: 'error', message: 'pref_key is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, user_id)
      .input('CompanyID', sql.Int, company_id)
      .input('BranchID', sql.Int, branch_id)
      .input('PrefKey', sql.NVarChar(100), pref_key)
      .input('UpdatedBy', sql.Int, user_id)
      .query(`
        UPDATE dbo.UserPreferences
        SET IsActive = 0,
            UpdatedOn = SYSDATETIME(),
            UpdatedBy = @UpdatedBy
        WHERE IsActive = 1
          AND UserID = @UserID
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
      message: 'User preference reset',
      data: { affected: result.recordset?.[0]?.affected || 0 }
    });
  } catch (error) {
    console.error('Error deleting user preference:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to delete user preference' });
  }
});

module.exports = router;


