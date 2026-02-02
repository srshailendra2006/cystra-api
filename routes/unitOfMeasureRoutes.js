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
 * /api/v1/unit-of-measures:
 *   get:
 *     summary: List Unit Of Measures (dbo.sp_UnitOfMeasure_GetAll)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_inactive
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, includes inactive UOMs
 *       - in: query
 *         name: dropdown
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, returns {label,value} items for dropdowns
 *     responses:
 *       200:
 *         description: UOM list
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const includeInactive = String(req.query.include_inactive ?? '').trim().toLowerCase();
    const inc = includeInactive === '1' || includeInactive === 'true';
    const dropdown = wantsDropdown(req);

    const pool = await getPool();
    const result = await pool.request()
      .input('IncludeInactive', sql.Bit, inc)
      .execute('dbo.sp_UnitOfMeasure_GetAll');

    const rows = result.recordset || [];
    return res.status(200).json({
      status: 'success',
      data: dropdown
        ? rows.map((r) => ({
            label: r.UOMName ?? r.uom_name ?? r.UnitOfMeasureName ?? String(r.UnitOfMeasureID ?? r.unit_of_measure_id),
            value: r.UnitOfMeasureID ?? r.unit_of_measure_id,
            uom_code: r.UOMCode ?? r.uom_code ?? null
          }))
        : rows
    });
  } catch (error) {
    console.error('Error fetching UOMs:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch unit of measures' });
  }
});

/**
 * @swagger
 * /api/v1/unit-of-measures/{id}:
 *   get:
 *     summary: Get Unit Of Measure by ID (dbo.sp_UnitOfMeasure_GetByID)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: UOM }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const pool = await getPool();
    const result = await pool.request()
      .input('UnitOfMeasureID', sql.Int, id)
      .execute('dbo.sp_UnitOfMeasure_GetByID');

    const row = result.recordset?.[0];
    if (!row) return res.status(404).json({ status: 'error', message: 'Unit of measure not found' });
    return res.status(200).json({ status: 'success', data: row });
  } catch (error) {
    console.error('Error fetching UOM:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch unit of measure' });
  }
});

/**
 * @swagger
 * /api/v1/unit-of-measures:
 *   post:
 *     summary: Create Unit Of Measure (dbo.sp_UnitOfMeasure_Create)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [uom_code, uom_name, uom_type]
 *             properties:
 *               uom_code: { type: string, example: "KG" }
 *               uom_name: { type: string, example: "Kilogram" }
 *               uom_type: { type: string, example: "Weight" }
 *               description: { type: string, nullable: true, example: "Weight unit" }
 *     responses:
 *       201: { description: Created }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const uom_code = (req.body.uom_code || '').trim();
    const uom_name = (req.body.uom_name || '').trim();
    const uom_type = (req.body.uom_type || '').trim();
    const description = req.body.description ?? null;

    if (!uom_code || !uom_name || !uom_type) {
      return res.status(400).json({
        status: 'error',
        message: 'uom_code, uom_name, and uom_type are required'
      });
    }

    const pool = await getPool();
    const createdBy = req.user?.user_id ? String(req.user.user_id) : (req.body.created_by ?? null);

    const result = await pool.request()
      .input('UOMCode', sql.NVarChar(20), uom_code)
      .input('UOMName', sql.NVarChar(100), uom_name)
      .input('UOMType', sql.NVarChar(50), uom_type)
      .input('Description', sql.NVarChar(255), description)
      .input('CreatedBy', sql.NVarChar(100), createdBy)
      .execute('dbo.sp_UnitOfMeasure_Create');

    return res.status(201).json({
      status: 'success',
      message: 'Unit of measure created successfully',
      data: result.recordset?.[0] ?? null
    });
  } catch (error) {
    console.error('Error creating UOM:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to create unit of measure' });
  }
});

/**
 * @swagger
 * /api/v1/unit-of-measures/{id}:
 *   put:
 *     summary: Update Unit Of Measure (dbo.sp_UnitOfMeasure_Update)
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
 *             required: [uom_code, uom_name, uom_type]
 *             properties:
 *               uom_code: { type: string }
 *               uom_name: { type: string }
 *               uom_type: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const uom_code = (req.body.uom_code || '').trim();
    const uom_name = (req.body.uom_name || '').trim();
    const uom_type = (req.body.uom_type || '').trim();
    const description = req.body.description ?? null;

    if (!uom_code || !uom_name || !uom_type) {
      return res.status(400).json({
        status: 'error',
        message: 'uom_code, uom_name, and uom_type are required'
      });
    }

    const pool = await getPool();
    const existing = await pool.request()
      .input('UnitOfMeasureID', sql.Int, id)
      .execute('dbo.sp_UnitOfMeasure_GetByID');
    if (!existing.recordset?.length) {
      return res.status(404).json({ status: 'error', message: 'Unit of measure not found' });
    }

    const result = await pool.request()
      .input('UnitOfMeasureID', sql.Int, id)
      .input('UOMCode', sql.NVarChar(20), uom_code)
      .input('UOMName', sql.NVarChar(100), uom_name)
      .input('UOMType', sql.NVarChar(50), uom_type)
      .input('Description', sql.NVarChar(255), description)
      .execute('dbo.sp_UnitOfMeasure_Update');

    return res.status(200).json({
      status: 'success',
      message: 'Unit of measure updated successfully',
      data: result.recordset?.[0] ?? null
    });
  } catch (error) {
    console.error('Error updating UOM:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update unit of measure' });
  }
});

/**
 * @swagger
 * /api/v1/unit-of-measures/{id}/activate:
 *   post:
 *     summary: Activate Unit Of Measure (dbo.sp_UnitOfMeasure_Activate)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Activated }
 */
router.post('/:id/activate', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const pool = await getPool();
    await pool.request()
      .input('UnitOfMeasureID', sql.Int, id)
      .execute('dbo.sp_UnitOfMeasure_Activate');

    return res.status(200).json({ status: 'success', message: 'Unit of measure activated successfully' });
  } catch (error) {
    console.error('Error activating UOM:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to activate unit of measure' });
  }
});

/**
 * @swagger
 * /api/v1/unit-of-measures/{id}:
 *   delete:
 *     summary: Deactivate Unit Of Measure (dbo.sp_UnitOfMeasure_Deactivate)
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
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const pool = await getPool();
    await pool.request()
      .input('UnitOfMeasureID', sql.Int, id)
      .execute('dbo.sp_UnitOfMeasure_Deactivate');

    return res.status(200).json({ status: 'success', message: 'Unit of measure deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating UOM:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to deactivate unit of measure' });
  }
});

module.exports = router;

