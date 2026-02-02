const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function toBit(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'true') return 1;
  if (s === '0' || s === 'false') return 0;
  return null;
}

function wantsDropdown(req) {
  const v = req.query.dropdown ?? req.query.format;
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'dropdown';
}

function toDecimalOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @swagger
 * /api/v1/gas-types:
 *   get:
 *     summary: List Gas Types (dbo.sp_GasType_Search_ByCompany)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string }
 *         description: Search by GasName/GasCode/CASNumber/UNNumber/GasState
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
 *       - in: query
 *         name: dropdown
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: If true, returns {label,value} items for dropdowns
 *     responses:
 *       200:
 *         description: Gas types list
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const searchRaw = (req.query.search || '').trim();
    const dropdown = wantsDropdown(req);

    const activeRaw = req.query.active;
    let active = 1;
    if (activeRaw !== undefined && activeRaw !== null && String(activeRaw).trim().toLowerCase() === 'all') {
      active = null;
    } else {
      const b = toBit(activeRaw);
      active = b === null ? 1 : b;
    }

    const companyId = req.user?.company_id ? parseInt(req.user.company_id, 10) : null;
    if (!companyId) {
      return res.status(400).json({ status: 'error', message: 'Company context missing in token' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('Active', sql.Bit, active === null ? null : Boolean(active))
      .input('Search', sql.NVarChar(100), searchRaw || null)
      .execute('dbo.sp_GasType_Search_ByCompany');

    const rows = result.recordset || [];
    return res.status(200).json({
      status: 'success',
      data: dropdown
        ? rows.map((r) => ({ label: r.gas_name, value: r.gas_type_id, gas_code: r.gas_code }))
        : rows
    });
  } catch (error) {
    console.error('Error fetching gas types:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch gas types' });
  }
});

/**
 * @swagger
 * /api/v1/gas-types:
 *   post:
 *     summary: Create Gas Type (dbo.sp_GasType_Create)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gas_code, gas_name, gas_category_id, unit_of_measure_id, gas_state]
 *             properties:
 *               gas_code: { type: string, example: "O2" }
 *               gas_name: { type: string, example: "Oxygen" }
 *               gas_category_id: { type: integer, example: 1 }
 *               unit_of_measure_id: { type: integer, example: 1 }
 *               gas_purity: { type: string, nullable: true, example: "99.5%" }
 *               cas_number: { type: string, nullable: true, example: "7782-44-7" }
 *               un_number: { type: string, nullable: true, example: "1072" }
 *               gas_state: { type: string, example: "Gas" }
 *               hazard_class: { type: string, nullable: true, example: "2.2" }
 *               is_flammable: { type: boolean, default: false }
 *               is_toxic: { type: boolean, default: false }
 *               is_oxidizer: { type: boolean, default: false }
 *               working_pressure_bar: { type: integer, nullable: true, example: 150 }
 *               storage_temp_min: { type: number, nullable: true, example: -20 }
 *               storage_temp_max: { type: number, nullable: true, example: 50 }
 *               is_mixture: { type: boolean, default: false }
 *               is_system_defined: { type: boolean, default: true }
 *               is_active: { type: boolean, default: true }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error / duplicate }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user?.company_id ? parseInt(req.user.company_id, 10) : null;
    if (!companyId) {
      return res.status(400).json({ status: 'error', message: 'Company context missing in token' });
    }

    const gas_code = (req.body.gas_code || '').trim();
    const gas_name = (req.body.gas_name || '').trim();
    const gas_category_id = toInt(req.body.gas_category_id);
    const unit_of_measure_id = toInt(req.body.unit_of_measure_id);
    const gas_state = (req.body.gas_state || '').trim();

    if (!gas_code || !gas_name || !gas_category_id || !unit_of_measure_id || !gas_state) {
      return res.status(400).json({
        status: 'error',
        message: 'gas_code, gas_name, gas_category_id, unit_of_measure_id, and gas_state are required'
      });
    }

    const pool = await getPool();
    const createdBy = req.user?.user_id ? String(req.user.user_id) : (req.body.created_by ?? null);

    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('GasCode', sql.NVarChar(20), gas_code)
      .input('GasName', sql.NVarChar(100), gas_name)
      .input('GasCategoryID', sql.Int, gas_category_id)
      .input('UnitOfMeasureID', sql.Int, unit_of_measure_id)
      .input('GasPurity', sql.NVarChar(50), req.body.gas_purity ?? null)
      .input('CASNumber', sql.NVarChar(50), req.body.cas_number ?? null)
      .input('UNNumber', sql.NVarChar(10), req.body.un_number ?? null)
      .input('GasState', sql.NVarChar(20), gas_state)
      .input('HazardClass', sql.NVarChar(50), req.body.hazard_class ?? null)
      .input('IsFlammable', sql.Bit, Boolean(req.body.is_flammable))
      .input('IsToxic', sql.Bit, Boolean(req.body.is_toxic))
      .input('IsOxidizer', sql.Bit, Boolean(req.body.is_oxidizer))
      .input('WorkingPressureBar', sql.Int, toInt(req.body.working_pressure_bar))
      .input('StorageTempMin', sql.Decimal(5, 2), toDecimalOrNull(req.body.storage_temp_min))
      .input('StorageTempMax', sql.Decimal(5, 2), toDecimalOrNull(req.body.storage_temp_max))
      .input('IsMixture', sql.Bit, Boolean(req.body.is_mixture))
      .input('CreatedBy', sql.NVarChar(100), createdBy)
      .execute('dbo.sp_GasType_Create');

    const gas_type_id = result.recordset?.[0]?.gas_type_id;
    return res.status(201).json({
      status: 'success',
      message: 'Gas type created successfully',
      data: { gas_type_id }
    });
  } catch (error) {
    console.error('Error creating gas type:', error);
    const msg = error.message || 'Failed to create gas type';
    const isDup = /Gas Code already exists for this company/i.test(msg);
    return res.status(isDup ? 400 : 500).json({ status: 'error', message: msg });
  }
});

/**
 * @swagger
 * /api/v1/gas-types/{id}:
 *   get:
 *     summary: Get Gas Type by ID
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Gas type }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const companyId = req.user?.company_id ? parseInt(req.user.company_id, 10) : null;
    if (!companyId) {
      return res.status(400).json({ status: 'error', message: 'Company context missing in token' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('GasTypeID', sql.Int, id)
      .execute('dbo.sp_GasType_GetByID_ByCompany');

    const row = result.recordset?.[0];
    if (!row) return res.status(404).json({ status: 'error', message: 'Gas type not found' });
    return res.status(200).json({ status: 'success', data: row });
  } catch (error) {
    console.error('Error fetching gas type:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch gas type' });
  }
});

/**
 * @swagger
 * /api/v1/gas-types/{id}:
 *   put:
 *     summary: Update Gas Type (dbo.sp_GasType_Update_ByCompany)
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
 *             required: [gas_code, gas_name, gas_category_id, unit_of_measure_id, gas_state, is_flammable, is_toxic, is_oxidizer, is_mixture, is_active]
 *             properties:
 *               gas_code: { type: string }
 *               gas_name: { type: string }
 *               gas_category_id: { type: integer }
 *               unit_of_measure_id: { type: integer }
 *               gas_purity: { type: string, nullable: true }
 *               cas_number: { type: string, nullable: true }
 *               un_number: { type: string, nullable: true }
 *               gas_state: { type: string }
 *               hazard_class: { type: string, nullable: true }
 *               is_flammable: { type: boolean }
 *               is_toxic: { type: boolean }
 *               is_oxidizer: { type: boolean }
 *               working_pressure_bar: { type: integer, nullable: true }
 *               storage_temp_min: { type: number, nullable: true }
 *               storage_temp_max: { type: number, nullable: true }
 *               is_mixture: { type: boolean }
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const pool = await getPool();
    const companyId = req.user?.company_id ? parseInt(req.user.company_id, 10) : null;
    if (!companyId) {
      return res.status(400).json({ status: 'error', message: 'Company context missing in token' });
    }

    const gas_code = (req.body.gas_code || '').trim();
    const gas_name = (req.body.gas_name || '').trim();
    const gas_category_id = toInt(req.body.gas_category_id);
    const unit_of_measure_id = toInt(req.body.unit_of_measure_id);
    const gas_state = (req.body.gas_state || '').trim();
    const is_flammable = req.body.is_flammable;
    const is_toxic = req.body.is_toxic;
    const is_oxidizer = req.body.is_oxidizer;
    const is_mixture = req.body.is_mixture;
    const is_active = req.body.is_active;

    if (!gas_code || !gas_name || !gas_category_id || !unit_of_measure_id || !gas_state) {
      return res.status(400).json({
        status: 'error',
        message: 'gas_code, gas_name, gas_category_id, unit_of_measure_id, and gas_state are required'
      });
    }
    if (is_flammable === undefined || is_toxic === undefined || is_oxidizer === undefined || is_mixture === undefined || is_active === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'is_flammable, is_toxic, is_oxidizer, is_mixture, and is_active are required'
      });
    }

    const updatedBy = req.user?.user_id ? String(req.user.user_id) : (req.body.updated_by ?? req.body.created_by ?? null);

    await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('GasTypeID', sql.Int, id)
      .input('GasCode', sql.NVarChar(20), gas_code)
      .input('GasName', sql.NVarChar(100), gas_name)
      .input('GasCategoryID', sql.Int, gas_category_id)
      .input('UnitOfMeasureID', sql.Int, unit_of_measure_id)
      .input('GasPurity', sql.NVarChar(50), req.body.gas_purity ?? null)
      .input('CASNumber', sql.NVarChar(50), req.body.cas_number ?? null)
      .input('UNNumber', sql.NVarChar(10), req.body.un_number ?? null)
      .input('GasState', sql.NVarChar(20), gas_state)
      .input('HazardClass', sql.NVarChar(50), req.body.hazard_class ?? null)
      .input('IsFlammable', sql.Bit, Boolean(is_flammable))
      .input('IsToxic', sql.Bit, Boolean(is_toxic))
      .input('IsOxidizer', sql.Bit, Boolean(is_oxidizer))
      .input('WorkingPressureBar', sql.Int, toInt(req.body.working_pressure_bar))
      .input('StorageTempMin', sql.Decimal(5, 2), toDecimalOrNull(req.body.storage_temp_min))
      .input('StorageTempMax', sql.Decimal(5, 2), toDecimalOrNull(req.body.storage_temp_max))
      .input('IsMixture', sql.Bit, Boolean(is_mixture))
      .input('IsActive', sql.Bit, Boolean(is_active))
      .input('UpdatedBy', sql.NVarChar(100), updatedBy)
      .execute('dbo.sp_GasType_Update_ByCompany');

    return res.status(200).json({ status: 'success', message: 'Gas type updated successfully' });
  } catch (error) {
    console.error('Error updating gas type:', error);
    const msg = error.message || 'Failed to update gas type';
    const isDup = /Gas Code already exists for this company/i.test(msg);
    const isLocked = /system-defined and locked/i.test(msg) || /not owned by company/i.test(msg);
    return res.status(isDup ? 400 : isLocked ? 404 : 500).json({ status: 'error', message: msg });
  }
});

/**
 * @swagger
 * /api/v1/gas-types/{id}:
 *   delete:
 *     summary: Deactivate Gas Type (soft delete) (dbo.sp_GasType_Deactivate_ByCompany)
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
 *       400: { description: GasType mapped (deactivate mappings first) }
 *       404: { description: Not found }
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const companyId = req.user?.company_id ? parseInt(req.user.company_id, 10) : null;
    if (!companyId) {
      return res.status(400).json({ status: 'error', message: 'Company context missing in token' });
    }

    const pool = await getPool();
    const deactivatedBy = req.user?.user_id ? String(req.user.user_id) : (req.body?.deactivated_by ?? req.body?.updated_by ?? null);

    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('GasTypeID', sql.Int, id)
      .input('DeactivatedBy', sql.NVarChar(100), deactivatedBy)
      .execute('dbo.sp_GasType_Deactivate_ByCompany');

    const row = result.recordset?.[0];
    return res.status(200).json({
      status: 'success',
      message: row?.message || 'Gas type deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting gas type:', error);
    const msg = error.message || 'Failed to delete gas type';
    const isMapped = /Deactivate mappings first/i.test(msg) || /mapped to cylinder families/i.test(msg);
    const isNotFound = /not found, not owned by company, already inactive, or system-defined/i.test(msg);
    return res.status(isMapped ? 400 : isNotFound ? 404 : 500).json({ status: 'error', message: msg });
  }
});

module.exports = router;

