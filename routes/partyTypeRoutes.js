const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

function parseActiveParam(v) {
  if (v === undefined || v === null || v === '') return 1; // default: active only
  const s = String(v).trim().toLowerCase();
  if (s === 'all') return null;
  if (s === 'true' || s === '1') return 1;
  if (s === 'false' || s === '0') return 0;
  return 1;
}

/**
 * @swagger
 * /api/v1/party-types:
 *   get:
 *     summary: List Party Types
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         required: false
 *         schema:
 *           oneOf:
 *             - type: integer
 *               enum: [0, 1]
 *             - type: string
 *               enum: [all]
 *           default: 1
 *         description: Filter by IsActive (1=active, 0=inactive, all=both)
 *     responses:
 *       200:
 *         description: Party types list
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const active = parseActiveParam(req.query.active);
    const pool = await getPool();

    const result = await pool.request()
      .input('active', sql.Bit, active === null ? null : Boolean(active))
      .query(`
        SELECT
          PartyTypeID as party_type_id,
          TypeCode as type_code,
          TypeName as type_name,
          IsActive as is_active
        FROM dbo.PartyType
        WHERE (@active IS NULL OR IsActive = @active)
        ORDER BY TypeName ASC, TypeCode ASC
      `);

    return res.status(200).json({
      status: 'success',
      data: (result.recordset || []).map((r) => ({
        label: r.type_name,
        value: r.party_type_id
      }))
    });
  } catch (error) {
    console.error('Error fetching party types:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch party types'
    });
  }
});

module.exports = router;


