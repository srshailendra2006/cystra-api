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
 * /api/v1/gas-categories:
 *   get:
 *     summary: List Gas Categories (dbo.sp_GasCategory_GetAll)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_inactive
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, includes inactive categories
 *       - in: query
 *         name: dropdown
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, returns {label,value} items for dropdowns
 *     responses:
 *       200:
 *         description: Gas categories list
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const includeInactive = String(req.query.include_inactive ?? '').trim().toLowerCase();
    const inc = includeInactive === '1' || includeInactive === 'true';
    const dropdown = wantsDropdown(req);

    const pool = await getPool();
    const result = await pool.request()
      .input('IncludeInactive', sql.Bit, inc)
      .execute('dbo.sp_GasCategory_GetAll');

    const rows = result.recordset || [];
    return res.status(200).json({
      status: 'success',
      data: dropdown
        ? rows.map((r) => ({
            label: r.GasCategoryName ?? r.gas_category_name ?? r.CategoryName ?? r.category_name ?? String(r.GasCategoryID ?? r.gas_category_id),
            value: r.GasCategoryID ?? r.gas_category_id
          }))
        : rows
    });
  } catch (error) {
    console.error('Error fetching gas categories:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch gas categories' });
  }
});

/**
 * @swagger
 * /api/v1/gas-categories/{id}:
 *   get:
 *     summary: Get Gas Category by ID (dbo.sp_GasCategory_GetByID)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Gas category }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const pool = await getPool();
    const result = await pool.request()
      .input('GasCategoryID', sql.Int, id)
      .execute('dbo.sp_GasCategory_GetByID');

    const row = result.recordset?.[0];
    if (!row) return res.status(404).json({ status: 'error', message: 'Gas category not found' });
    return res.status(200).json({ status: 'success', data: row });
  } catch (error) {
    console.error('Error fetching gas category:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch gas category' });
  }
});

/**
 * @swagger
 * /api/v1/gas-categories:
 *   post:
 *     summary: Create Gas Category (dbo.sp_GasCategory_Create)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gas_category_code, gas_category_name]
 *             properties:
 *               gas_category_code: { type: string, example: "IND" }
 *               gas_category_name: { type: string, example: "Industrial" }
 *               description: { type: string, nullable: true, example: "Industrial gases" }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const gas_category_code = (req.body.gas_category_code || '').trim();
    const gas_category_name = (req.body.gas_category_name || '').trim();
    const description = req.body.description ?? null;

    if (!gas_category_code || !gas_category_name) {
      return res.status(400).json({
        status: 'error',
        message: 'gas_category_code and gas_category_name are required'
      });
    }

    const pool = await getPool();
    const createdBy = req.user?.user_id ? String(req.user.user_id) : (req.body.created_by ?? null);

    const result = await pool.request()
      .input('GasCategoryCode', sql.NVarChar(20), gas_category_code)
      .input('GasCategoryName', sql.NVarChar(100), gas_category_name)
      .input('Description', sql.NVarChar(255), description)
      .input('CreatedBy', sql.NVarChar(100), createdBy)
      .execute('dbo.sp_GasCategory_Create');

    return res.status(201).json({
      status: 'success',
      message: 'Gas category created successfully',
      data: result.recordset?.[0] ?? null
    });
  } catch (error) {
    console.error('Error creating gas category:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to create gas category' });
  }
});

/**
 * @swagger
 * /api/v1/gas-categories/{id}:
 *   put:
 *     summary: Update Gas Category (dbo.sp_GasCategory_Update)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gas_category_code, gas_category_name]
 *             properties:
 *               gas_category_code: { type: string }
 *               gas_category_name: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const gas_category_code = (req.body.gas_category_code || '').trim();
    const gas_category_name = (req.body.gas_category_name || '').trim();
    const description = req.body.description ?? null;

    if (!gas_category_code || !gas_category_name) {
      return res.status(400).json({
        status: 'error',
        message: 'gas_category_code and gas_category_name are required'
      });
    }

    const pool = await getPool();
    const existing = await pool.request()
      .input('GasCategoryID', sql.Int, id)
      .execute('dbo.sp_GasCategory_GetByID');
    if (!existing.recordset?.length) {
      return res.status(404).json({ status: 'error', message: 'Gas category not found' });
    }

    const result = await pool.request()
      .input('GasCategoryID', sql.Int, id)
      .input('GasCategoryCode', sql.NVarChar(20), gas_category_code)
      .input('GasCategoryName', sql.NVarChar(100), gas_category_name)
      .input('Description', sql.NVarChar(255), description)
      .execute('dbo.sp_GasCategory_Update');

    return res.status(200).json({
      status: 'success',
      message: 'Gas category updated successfully',
      data: result.recordset?.[0] ?? null
    });
  } catch (error) {
    console.error('Error updating gas category:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update gas category' });
  }
});

/**
 * @swagger
 * /api/v1/gas-categories/{id}:
 *   delete:
 *     summary: Deactivate Gas Category (dbo.sp_GasCategory_Deactivate)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deactivated }
 *       404: { description: Not found }
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const pool = await getPool();
    const existing = await pool.request()
      .input('GasCategoryID', sql.Int, id)
      .execute('dbo.sp_GasCategory_GetByID');
    if (!existing.recordset?.length) {
      return res.status(404).json({ status: 'error', message: 'Gas category not found' });
    }

    await pool.request()
      .input('GasCategoryID', sql.Int, id)
      .execute('dbo.sp_GasCategory_Deactivate');

    return res.status(200).json({ status: 'success', message: 'Gas category deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating gas category:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to deactivate gas category' });
  }
});

module.exports = router;

