const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

/**
 * @swagger
 * /api/v1/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies & Branches]
 *     description: Get list of all active companies for registration
 *     responses:
 *       200:
 *         description: List of companies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       company_id:
 *                         type: integer
 *                       company_code:
 *                         type: string
 *                       company_name:
 *                         type: string
 *                       city:
 *                         type: string
 *                       country:
 *                         type: string
 */
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id as company_id, company_code, company_name, city, state, country, phone, email
      FROM companies
      WHERE is_active = 1
      ORDER BY company_name
    `);

    res.status(200).json({
      status: 'success',
      data: result.recordset
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch companies'
    });
  }
});

/**
 * @swagger
 * /api/v1/companies/{companyId}/branches:
 *   get:
 *     summary: Get branches for a company
 *     tags: [Companies & Branches]
 *     description: Get list of all active branches for a specific company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: List of branches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       branch_id:
 *                         type: integer
 *                       branch_code:
 *                         type: string
 *                       branch_name:
 *                         type: string
 *                       city:
 *                         type: string
 *                       country:
 *                         type: string
 */
router.get('/:companyId/branches', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const pool = await getPool();
    const result = await pool.request()
      .input('company_id', sql.Int, companyId)
      .execute('sp_GetBranchesByCompany');

    res.status(200).json({
      status: 'success',
      data: result.recordset
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch branches'
    });
  }
});

module.exports = router;

