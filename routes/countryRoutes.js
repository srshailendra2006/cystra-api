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
 * /api/v1/countries:
 *   get:
 *     summary: List countries (CountryMaster)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string }
 *         description: Search by country name/code
 *       - in: query
 *         name: dropdown
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, returns {label,value} items for dropdowns
 *     responses:
 *       200:
 *         description: Countries list
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const searchRaw = (req.query.search || '').trim();
    const like = searchRaw ? `%${searchRaw}%` : null;
    const dropdown = wantsDropdown(req);

    const pool = await getPool();
    const result = await pool.request()
      .input('search', sql.NVarChar(200), like)
      .query(`
        SELECT
          CountryID as id,
          CountryName as country_name,
          CountryCode as country_code
        FROM dbo.CountryMaster
        WHERE (@search IS NULL OR CountryName LIKE @search OR ISNULL(CountryCode,'') LIKE @search)
        ORDER BY CountryName ASC
      `);

    const rows = result.recordset || [];
    return res.status(200).json({
      status: 'success',
      data: dropdown
        ? rows.map((r) => ({ label: r.country_name, value: r.id, country_code: r.country_code ?? null }))
        : rows
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch countries' });
  }
});

module.exports = router;


