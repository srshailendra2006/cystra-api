const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function toBitOrDefault(v, def) {
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'true') return 1;
  if (s === '0' || s === 'false') return 0;
  return def;
}

/**
 * @swagger
 * /api/v1/gas-type-cylinder-family-maps:
 *   get:
 *     summary: List GasType ↔ CylinderFamily mappings (company scoped)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gas_type_id
 *         required: false
 *         schema: { type: integer }
 *       - in: query
 *         name: cylinder_family_id
 *         required: false
 *         schema: { type: integer }
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
 *       200: { description: Mapping list }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user?.company_id ? parseInt(req.user.company_id) : null;
    if (!companyId) return res.status(400).json({ status: 'error', message: 'Company context missing in token' });

    const gasTypeId = toInt(req.query.gas_type_id);
    const cylinderFamilyId = toInt(req.query.cylinder_family_id);
    const activeRaw = req.query.active;
    const active = activeRaw !== undefined && activeRaw !== null && String(activeRaw).trim().toLowerCase() === 'all'
      ? null
      : Boolean(toBitOrDefault(activeRaw, 1));

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('GasTypeID', sql.Int, gasTypeId)
      .input('CylinderFamilyID', sql.Int, cylinderFamilyId)
      .input('IsActive', sql.Bit, active === null ? null : active)
      .query(`
        SELECT
          m.GasTypeCylinderFamilyMapID as gas_type_cylinder_family_map_id,
          m.CompanyID as company_id,
          m.GasTypeID as gas_type_id,
          gt.GasCode as gas_code,
          gt.GasName as gas_name,
          m.CylinderFamilyID as cylinder_family_id,
          cf.CylinderFamilyCode as cylinder_family_code,
          cf.CylinderFamilyName as cylinder_family_name,
          m.IsAllowed as is_allowed,
          m.Remarks as remarks,
          m.IsActive as is_active,
          m.CreatedBy as created_by,
          m.CreatedOn as created_on
        FROM dbo.GasTypeCylinderFamilyMap m
        INNER JOIN dbo.GasType gt ON gt.GasTypeID = m.GasTypeID
        INNER JOIN dbo.CylinderFamily cf ON cf.CylinderFamilyID = m.CylinderFamilyID
        WHERE m.CompanyID = @CompanyID
          AND (@GasTypeID IS NULL OR m.GasTypeID = @GasTypeID)
          AND (@CylinderFamilyID IS NULL OR m.CylinderFamilyID = @CylinderFamilyID)
          AND (@IsActive IS NULL OR m.IsActive = @IsActive)
        ORDER BY cf.CylinderFamilyName ASC, gt.GasName ASC
      `);

    return res.status(200).json({ status: 'success', data: result.recordset || [] });
  } catch (error) {
    console.error('Error listing GasTypeCylinderFamilyMap:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to list mappings' });
  }
});

/**
 * @swagger
 * /api/v1/gas-type-cylinder-family-maps:
 *   post:
 *     summary: Upsert GasType ↔ CylinderFamily mapping (dbo.sp_GasTypeCylinderFamilyMap_Create)
 *     tags: [Masters]
 *     security:
 *       - bearerAuth: []
 *     description: CompanyID is taken from login token. This endpoint inserts or updates the mapping.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gas_type_id, cylinder_family_id]
 *             properties:
 *               gas_type_id: { type: integer, example: 1 }
 *               cylinder_family_id: { type: integer, example: 2 }
 *               is_allowed: { type: boolean, default: true }
 *               remarks: { type: string, nullable: true }
 *               is_active: { type: boolean, default: true }
 *     responses:
 *       200: { description: Updated }
 *       201: { description: Created }
 *       400: { description: Validation error }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user?.company_id ? parseInt(req.user.company_id) : null;
    if (!companyId) return res.status(400).json({ status: 'error', message: 'Company context missing in token' });

    const gasTypeId = toInt(req.body.gas_type_id);
    const cylinderFamilyId = toInt(req.body.cylinder_family_id);
    if (!gasTypeId || !cylinderFamilyId) {
      return res.status(400).json({
        status: 'error',
        message: 'gas_type_id and cylinder_family_id are required'
      });
    }

    const isAllowed = Boolean(toBitOrDefault(req.body.is_allowed, 1));
    const isActive = Boolean(toBitOrDefault(req.body.is_active, 1));
    const remarks = req.body.remarks ?? null;
    const createdBy = req.user?.user_id ? String(req.user.user_id) : (req.body.created_by ?? null);

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('GasTypeID', sql.Int, gasTypeId)
      .input('CylinderFamilyID', sql.Int, cylinderFamilyId)
      .input('IsAllowed', sql.Bit, isAllowed)
      .input('Remarks', sql.NVarChar(255), remarks)
      .input('IsActive', sql.Bit, isActive)
      .input('CreatedBy', sql.NVarChar(100), createdBy)
      .execute('dbo.sp_GasTypeCylinderFamilyMap_Create');

    // SP returns either {result:'UPDATED'} or {gas_type_cylinder_family_map_id:<id>}
    const row = result.recordset?.[0] ?? null;
    const isUpdated = row && (row.result === 'UPDATED' || row.result === 'updated');

    return res.status(isUpdated ? 200 : 201).json({
      status: 'success',
      message: isUpdated ? 'Mapping updated successfully' : 'Mapping created successfully',
      data: row
    });
  } catch (error) {
    console.error('Error upserting GasTypeCylinderFamilyMap:', error);
    // RAISERROR from SQL shows as 500 via mssql; map common validation to 400 if desired
    const msg = error.message || 'Failed to create mapping';
    const isValidation = /does not belong to the given Company/i.test(msg);
    return res.status(isValidation ? 400 : 500).json({ status: 'error', message: msg });
  }
});

module.exports = router;

