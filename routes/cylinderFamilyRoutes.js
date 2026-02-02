const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function toNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function wantsDropdown(req) {
  const v = req.query.dropdown ?? req.query.format;
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'dropdown';
}

function parseActiveParam(v) {
  if (v === undefined || v === null || v === '') return 1; // default active
  const s = String(v).trim().toLowerCase();
  if (s === 'all') return null;
  if (s === 'true' || s === '1') return 1;
  if (s === 'false' || s === '0') return 0;
  return 1;
}

function normalizeMaxFillRatio(v) {
  const n = toNum(v);
  if (n === null) return null;
  // Accept 0-1 ratio or 0-100 percent
  if (n > 1) return n / 100;
  return n;
}

const MATERIALS = ['Seamless Steel', 'Aluminium'];
const WORKING_PRESSURES = [150, 200, 300];
const DESIGN_STANDARDS = ['IS 7285', 'ISO 9809'];
const TEST_INTERVAL_YEARS = [2, 5];
const CYLINDER_SHAPES = ['Tall', 'Short', 'Jumbo'];

/**
 * @swagger
 * /api/v1/cylinder-families:
 *   get:
 *     summary: List Cylinder Families (Company scoped)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: false
 *         schema: { type: integer }
 *         description: Optional; defaults to token company_id
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string }
 *         description: Search by code/name/material
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
 *       200: { description: Cylinder families list }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const tokenCompanyId = req.user?.company_id ? parseInt(req.user.company_id) : null;
    const companyId = toInt(req.query.company_id) ?? tokenCompanyId;
    if (!companyId) return res.status(400).json({ status: 'error', message: 'company_id is required' });

    const searchRaw = (req.query.search || '').trim();
    const like = searchRaw ? `%${searchRaw}%` : null;
    const dropdown = wantsDropdown(req);
    const active = parseActiveParam(req.query.active);

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('Active', sql.Bit, active === null ? null : Boolean(active))
      .input('Search', sql.NVarChar(200), searchRaw || null)
      .execute('dbo.sp_CylinderFamily_GetList');

    const rows = result.recordset || [];
    return res.status(200).json({
      status: 'success',
      data: dropdown
        ? rows.map((r) => ({ label: r.cylinder_family_name, value: r.cylinder_family_code }))
        : rows
    });
  } catch (error) {
    console.error('Error fetching cylinder families:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch cylinder families' });
  }
});

/**
 * @swagger
 * /api/v1/cylinder-families/{id}:
 *   get:
 *     summary: Get Cylinder Family by ID
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: company_id
 *         required: false
 *         schema: { type: integer }
 *         description: Optional; defaults to token company_id
 *     responses:
 *       200: { description: Cylinder family }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const tokenCompanyId = req.user?.company_id ? parseInt(req.user.company_id) : null;
    const companyId = toInt(req.query.company_id) ?? tokenCompanyId;
    if (!companyId) return res.status(400).json({ status: 'error', message: 'company_id is required' });

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('CylinderFamilyID', sql.Int, id)
      .execute('dbo.sp_CylinderFamily_GetByID');

    const row = result.recordset?.[0];
    if (!row) return res.status(404).json({ status: 'error', message: 'Cylinder family not found' });
    return res.status(200).json({ status: 'success', data: row });
  } catch (error) {
    console.error('Error fetching cylinder family:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch cylinder family' });
  }
});

/**
 * @swagger
 * /api/v1/cylinder-families:
 *   post:
 *     summary: Create Cylinder Family
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     description: CompanyID is taken from login token (company scope).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cylinder_family_code
 *               - cylinder_family_name
 *               - material
 *               - water_capacity_liters
 *               - working_pressure_bar
 *               - test_interval_years
 *             properties:
 *               cylinder_family_code: { type: string, example: "FAM-01" }
 *               cylinder_family_name: { type: string, example: "50L Steel - 200bar" }
 *               material: { type: string, enum: [Seamless Steel, Aluminium] }
 *               water_capacity_liters: { type: number, example: 50 }
 *               working_pressure_bar: { type: integer, enum: [150, 200, 300] }
 *               test_pressure_bar: { type: number, nullable: true, description: "Defaults to 1.5 × working_pressure_bar" }
 *               design_standard: { type: string, nullable: true, enum: [IS 7285, ISO 9809] }
 *               test_interval_years: { type: integer, enum: [2, 5] }
 *               valve_type_id: { type: integer, nullable: true }
 *               neck_thread: { type: string, nullable: true }
 *               cylinder_shape: { type: string, nullable: true, enum: [Tall, Short, Jumbo] }
 *               tare_weight_kg: { type: number, nullable: true }
 *               max_fill_ratio: { type: number, nullable: true, description: "0-1 ratio or 0-100 percent" }
 *               is_medical_approved: { type: boolean, default: false }
 *               is_industrial_approved: { type: boolean, default: true }
 *               is_active: { type: boolean, default: true }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation / duplicate }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user?.company_id ? parseInt(req.user.company_id) : null;
    if (!companyId) return res.status(400).json({ status: 'error', message: 'Company context missing in token' });

    const code = (req.body.cylinder_family_code || '').trim();
    const name = (req.body.cylinder_family_name || '').trim();
    const material = (req.body.material || '').trim();
    const waterCap = toNum(req.body.water_capacity_liters);
    const working = toInt(req.body.working_pressure_bar);
    const testInterval = toInt(req.body.test_interval_years);

    if (!code || !name) {
      return res.status(400).json({ status: 'error', message: 'cylinder_family_code and cylinder_family_name are required' });
    }
    if (!MATERIALS.includes(material)) {
      return res.status(400).json({ status: 'error', message: `material must be one of: ${MATERIALS.join(', ')}` });
    }
    if (!waterCap || waterCap <= 0) {
      return res.status(400).json({ status: 'error', message: 'water_capacity_liters must be > 0' });
    }
    if (!working || !WORKING_PRESSURES.includes(working)) {
      return res.status(400).json({ status: 'error', message: `working_pressure_bar must be one of: ${WORKING_PRESSURES.join(', ')}` });
    }
    if (!testInterval || !TEST_INTERVAL_YEARS.includes(testInterval)) {
      return res.status(400).json({ status: 'error', message: `test_interval_years must be one of: ${TEST_INTERVAL_YEARS.join(', ')}` });
    }

    const designStandard = req.body.design_standard !== undefined && req.body.design_standard !== null && String(req.body.design_standard).trim() !== ''
      ? String(req.body.design_standard).trim()
      : null;
    if (designStandard && !DESIGN_STANDARDS.includes(designStandard)) {
      return res.status(400).json({ status: 'error', message: `design_standard must be one of: ${DESIGN_STANDARDS.join(', ')}` });
    }

    const cylinderShape = req.body.cylinder_shape !== undefined && req.body.cylinder_shape !== null && String(req.body.cylinder_shape).trim() !== ''
      ? String(req.body.cylinder_shape).trim()
      : null;
    if (cylinderShape && !CYLINDER_SHAPES.includes(cylinderShape)) {
      return res.status(400).json({ status: 'error', message: `cylinder_shape must be one of: ${CYLINDER_SHAPES.join(', ')}` });
    }

    const testPressure = toNum(req.body.test_pressure_bar) ?? (1.5 * working);
    const tareWeight = toNum(req.body.tare_weight_kg);
    const maxFillRatio = normalizeMaxFillRatio(req.body.max_fill_ratio);
    if (maxFillRatio !== null && (maxFillRatio < 0 || maxFillRatio > 1)) {
      return res.status(400).json({ status: 'error', message: 'max_fill_ratio must be between 0 and 1 (or 0-100 as percent)' });
    }

    const valveTypeId = toInt(req.body.valve_type_id);
    const neckThread = req.body.neck_thread ?? null;

    const isMedicalApproved = Boolean(req.body.is_medical_approved);
    const isIndustrialApproved = req.body.is_industrial_approved === undefined ? true : Boolean(req.body.is_industrial_approved);
    const isActive = req.body.is_active === undefined ? true : Boolean(req.body.is_active);

    const pool = await getPool();
    const createdBy = req.user?.user_id ? String(req.user.user_id) : (req.body.created_by ?? null);
    const insert = await pool.request()
      .input('CylinderFamilyCode', sql.NVarChar(30), code)
      .input('CylinderFamilyName', sql.NVarChar(100), name)
      .input('Material', sql.NVarChar(50), material)
      .input('WaterCapacityLiters', sql.Decimal(6, 2), waterCap)
      .input('WorkingPressureBar', sql.Int, working)
      .input('TestPressureBar', sql.Int, Math.round(testPressure))
      .input('DesignStandard', sql.NVarChar(50), designStandard)
      .input('TestIntervalYears', sql.Int, testInterval)
      .input('ValveTypeID', sql.Int, valveTypeId)
      .input('NeckThread', sql.NVarChar(50), neckThread)
      .input('CylinderShape', sql.NVarChar(50), cylinderShape)
      .input('TareWeightKg', sql.Decimal(6, 2), tareWeight)
      .input('MaxFillRatio', sql.Decimal(4, 2), maxFillRatio)
      .input('IsMedicalApproved', sql.Bit, isMedicalApproved)
      .input('IsIndustrialApproved', sql.Bit, isIndustrialApproved)
      .input('IsSystemDefined', sql.Bit, true) // admin-only; default true
      .input('IsActive', sql.Bit, isActive)
      .input('CreatedBy', sql.NVarChar(100), createdBy)
      .input('CompanyID', sql.Int, companyId)
      .execute('dbo.sp_CylinderFamily_Insert');

    return res.status(201).json({
      status: 'success',
      message: 'Cylinder family created successfully',
      data: insert.recordset?.[0] ?? null
    });
  } catch (error) {
    console.error('Error creating cylinder family:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to create cylinder family' });
  }
});

/**
 * @swagger
 * /api/v1/cylinder-families/{id}:
 *   put:
 *     summary: Update Cylinder Family (deactivate instead of delete)
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
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });
    const companyId = req.user?.company_id ? parseInt(req.user.company_id) : null;
    if (!companyId) return res.status(400).json({ status: 'error', message: 'Company context missing in token' });

    const pool = await getPool();
    const existing = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('CylinderFamilyID', sql.Int, id)
      .query(`SELECT TOP 1 * FROM dbo.CylinderFamily WHERE CompanyID=@CompanyID AND CylinderFamilyID=@CylinderFamilyID`);
    if (!existing.recordset?.length) {
      return res.status(404).json({ status: 'error', message: 'Cylinder family not found' });
    }

    const setParts = [];
    const request = pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('CylinderFamilyID', sql.Int, id);

    const body = req.body || {};
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k);

    if (has('cylinder_family_code')) {
      const code = String(body.cylinder_family_code || '').trim();
      if (!code) return res.status(400).json({ status: 'error', message: 'cylinder_family_code cannot be empty' });
      // uniqueness per company
      const dup = await pool.request()
        .input('CompanyID', sql.Int, companyId)
        .input('Code', sql.NVarChar(30), code)
        .input('Id', sql.Int, id)
        .query(`SELECT TOP 1 CylinderFamilyID FROM dbo.CylinderFamily WHERE CompanyID=@CompanyID AND CylinderFamilyCode=@Code AND CylinderFamilyID<>@Id`);
      if (dup.recordset?.length) {
        return res.status(400).json({ status: 'error', message: 'CylinderFamilyCode already exists for this company' });
      }
      request.input('CylinderFamilyCode', sql.NVarChar(30), code);
      setParts.push('CylinderFamilyCode = @CylinderFamilyCode');
    }

    if (has('cylinder_family_name')) {
      const name = String(body.cylinder_family_name || '').trim();
      if (!name) return res.status(400).json({ status: 'error', message: 'cylinder_family_name cannot be empty' });
      request.input('CylinderFamilyName', sql.NVarChar(100), name);
      setParts.push('CylinderFamilyName = @CylinderFamilyName');
    }

    if (has('material')) {
      const material = String(body.material || '').trim();
      if (!MATERIALS.includes(material)) {
        return res.status(400).json({ status: 'error', message: `material must be one of: ${MATERIALS.join(', ')}` });
      }
      request.input('Material', sql.NVarChar(50), material);
      setParts.push('Material = @Material');
    }

    if (has('water_capacity_liters')) {
      const waterCap = toNum(body.water_capacity_liters);
      if (!waterCap || waterCap <= 0) return res.status(400).json({ status: 'error', message: 'water_capacity_liters must be > 0' });
      request.input('WaterCapacityLiters', sql.Decimal(6, 2), waterCap);
      setParts.push('WaterCapacityLiters = @WaterCapacityLiters');
    }

    let newWorking = null;
    if (has('working_pressure_bar')) {
      const working = toInt(body.working_pressure_bar);
      if (!working || !WORKING_PRESSURES.includes(working)) {
        return res.status(400).json({ status: 'error', message: `working_pressure_bar must be one of: ${WORKING_PRESSURES.join(', ')}` });
      }
      newWorking = working;
      request.input('WorkingPressureBar', sql.Int, working);
      setParts.push('WorkingPressureBar = @WorkingPressureBar');
    }

    if (has('test_pressure_bar')) {
      const tp = toNum(body.test_pressure_bar);
      if (tp !== null && tp <= 0) return res.status(400).json({ status: 'error', message: 'test_pressure_bar must be > 0' });
      request.input('TestPressureBar', sql.Int, tp === null ? null : Math.round(tp));
      setParts.push('TestPressureBar = @TestPressureBar');
    } else if (newWorking !== null) {
      // auto-calc if working updated and test pressure not explicitly provided
      request.input('TestPressureBar', sql.Int, Math.round(1.5 * newWorking));
      setParts.push('TestPressureBar = @TestPressureBar');
    }

    if (has('design_standard')) {
      const ds = body.design_standard === null || body.design_standard === '' ? null : String(body.design_standard).trim();
      if (ds && !DESIGN_STANDARDS.includes(ds)) {
        return res.status(400).json({ status: 'error', message: `design_standard must be one of: ${DESIGN_STANDARDS.join(', ')}` });
      }
      request.input('DesignStandard', sql.NVarChar(50), ds);
      setParts.push('DesignStandard = @DesignStandard');
    }

    if (has('test_interval_years')) {
      const yrs = toInt(body.test_interval_years);
      if (!yrs || !TEST_INTERVAL_YEARS.includes(yrs)) {
        return res.status(400).json({ status: 'error', message: `test_interval_years must be one of: ${TEST_INTERVAL_YEARS.join(', ')}` });
      }
      request.input('TestIntervalYears', sql.Int, yrs);
      setParts.push('TestIntervalYears = @TestIntervalYears');
    }

    if (has('valve_type_id')) {
      request.input('ValveTypeID', sql.Int, toInt(body.valve_type_id));
      setParts.push('ValveTypeID = @ValveTypeID');
    }

    if (has('neck_thread')) {
      const v = body.neck_thread === null || body.neck_thread === '' ? null : String(body.neck_thread).trim();
      request.input('NeckThread', sql.NVarChar(50), v);
      setParts.push('NeckThread = @NeckThread');
    }

    if (has('cylinder_shape')) {
      const cs = body.cylinder_shape === null || body.cylinder_shape === '' ? null : String(body.cylinder_shape).trim();
      if (cs && !CYLINDER_SHAPES.includes(cs)) {
        return res.status(400).json({ status: 'error', message: `cylinder_shape must be one of: ${CYLINDER_SHAPES.join(', ')}` });
      }
      request.input('CylinderShape', sql.NVarChar(50), cs);
      setParts.push('CylinderShape = @CylinderShape');
    }

    if (has('tare_weight_kg')) {
      const tw = toNum(body.tare_weight_kg);
      if (tw !== null && tw <= 0) return res.status(400).json({ status: 'error', message: 'tare_weight_kg must be > 0' });
      request.input('TareWeightKg', sql.Decimal(6, 2), tw);
      setParts.push('TareWeightKg = @TareWeightKg');
    }

    if (has('max_fill_ratio')) {
      const mfr = normalizeMaxFillRatio(body.max_fill_ratio);
      if (mfr !== null && (mfr < 0 || mfr > 1)) {
        return res.status(400).json({ status: 'error', message: 'max_fill_ratio must be between 0 and 1 (or 0-100 as percent)' });
      }
      request.input('MaxFillRatio', sql.Decimal(4, 2), mfr);
      setParts.push('MaxFillRatio = @MaxFillRatio');
    }

    if (has('is_medical_approved')) {
      request.input('IsMedicalApproved', sql.Bit, Boolean(body.is_medical_approved));
      setParts.push('IsMedicalApproved = @IsMedicalApproved');
    }
    if (has('is_industrial_approved')) {
      request.input('IsIndustrialApproved', sql.Bit, Boolean(body.is_industrial_approved));
      setParts.push('IsIndustrialApproved = @IsIndustrialApproved');
    }
    if (has('is_active')) {
      request.input('IsActive', sql.Bit, Boolean(body.is_active));
      setParts.push('IsActive = @IsActive');
    }

    if (setParts.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No updatable fields provided' });
    }

    await request.query(`
      UPDATE dbo.CylinderFamily
      SET ${setParts.join(', ')}
      WHERE CompanyID=@CompanyID AND CylinderFamilyID=@CylinderFamilyID
    `);

    return res.status(200).json({ status: 'success', message: 'Cylinder family updated successfully' });
  } catch (error) {
    console.error('Error updating cylinder family:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update cylinder family' });
  }
});

/**
 * @swagger
 * /api/v1/cylinder-families/{id}:
 *   delete:
 *     summary: Deactivate Cylinder Family (soft delete)
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
    const companyId = req.user?.company_id ? parseInt(req.user.company_id) : null;
    if (!companyId) return res.status(400).json({ status: 'error', message: 'Company context missing in token' });

    const pool = await getPool();
    await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('CylinderFamilyID', sql.Int, id)
      .query(`UPDATE dbo.CylinderFamily SET IsActive = 0 WHERE CompanyID=@CompanyID AND CylinderFamilyID=@CylinderFamilyID`);

    return res.status(200).json({ status: 'success', message: 'Cylinder family deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating cylinder family:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to deactivate cylinder family' });
  }
});

module.exports = router;

