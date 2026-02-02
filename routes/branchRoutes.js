const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

/**
 * @swagger
 * /api/v1/branches:
 *   get:
 *     summary: Get branches for a company (query param)
 *     tags: [Companies & Branches]
 *     description: Backward-compatible endpoint for fetching branches using company_id query param.
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *         example: 2
 *     responses:
 *       200:
 *         description: List of branches
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const companyIdRaw = req.query.company_id ?? req.query.companyId;

    if (!companyIdRaw) {
      return res.status(400).json({
        status: 'error',
        message: 'company_id query param is required'
      });
    }

    const companyId = parseInt(companyIdRaw, 10);
    if (Number.isNaN(companyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'company_id must be a number'
      });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('company_id', sql.Int, companyId)
      .execute('sp_GetBranchesByCompany');

    return res.status(200).json({
      status: 'success',
      data: result.recordset
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch branches'
    });
  }
});

module.exports = router;


