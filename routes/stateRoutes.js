const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function wantsDropdown(req) {
  const v = req.query.dropdown ?? req.query.format;
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'dropdown';
}

/**
 * @swagger
 * /api/v1/states:
 *   get:
 *     summary: List states by country (dropdown)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by StateName/StateCode
 *       - in: query
 *         name: dropdown
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, returns {label,value} items for dropdowns
 *     responses:
 *       200:
 *         description: States list
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const country_id = toInt(req.query.country_id);
    if (!country_id) {
      return res.status(400).json({ status: 'error', message: 'country_id query param is required' });
    }

    const searchRaw = (req.query.search || '').trim();
    const search = searchRaw ? `%${searchRaw}%` : null;
    const dropdown = wantsDropdown(req);

    const pool = await getPool();
    const result = await pool.request()
      .input('country_id', sql.Int, country_id)
      .input('search', sql.NVarChar(200), search)
      .query(`
        SELECT
          StateID as id,
          StateName as state_name,
          StateCode as state_code,
          CountryID as country_id
        FROM dbo.StateMaster
        WHERE CountryID = @country_id
          AND (@search IS NULL OR StateName LIKE @search OR ISNULL(StateCode, '') LIKE @search)
        ORDER BY StateName ASC
      `);

    const rows = result.recordset || [];
    return res.status(200).json({
      status: 'success',
      data: dropdown
        ? rows.map((r) => ({ label: r.state_name, value: r.id, state_code: r.state_code ?? null, country_id: r.country_id }))
        : rows
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch states' });
  }
});

module.exports = router;
