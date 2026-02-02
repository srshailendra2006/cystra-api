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
 * /api/v1/cities:
 *   get:
 *     summary: List cities by state (CityMaster)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string }
 *         description: Search by city name/code
 *       - in: query
 *         name: dropdown
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, returns {label,value} items for dropdowns
 *     responses:
 *       200:
 *         description: Cities list
 *       400:
 *         description: Validation error
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const state_id = toInt(req.query.state_id);
    if (!state_id) {
      return res.status(400).json({ status: 'error', message: 'state_id query param is required' });
    }

    const searchRaw = (req.query.search || '').trim();
    const like = searchRaw ? `%${searchRaw}%` : null;
    const dropdown = wantsDropdown(req);

    const pool = await getPool();
    const result = await pool.request()
      .input('state_id', sql.Int, state_id)
      .input('search', sql.NVarChar(200), like)
      .query(`
        SELECT
          CityID as id,
          CityName as city_name,
          CityCode as city_code,
          StateID as state_id
        FROM dbo.CityMaster
        WHERE StateID = @state_id
          AND (@search IS NULL OR CityName LIKE @search OR ISNULL(CityCode,'') LIKE @search)
        ORDER BY CityName ASC
      `);

    const rows = result.recordset || [];
    return res.status(200).json({
      status: 'success',
      data: dropdown
        ? rows.map((r) => ({ label: r.city_name, value: r.id, city_code: r.city_code ?? null, state_id: r.state_id }))
        : rows
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch cities' });
  }
});

module.exports = router;


