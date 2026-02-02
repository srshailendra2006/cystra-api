const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

// Configure multer for CSV uploads
const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'party-gas-rates-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.csv') return cb(null, true);
  return cb(new Error('Only CSV files are allowed'), false);
};

const upload = multer({
  storage: uploadStorage,
  fileFilter: uploadFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function toDecimalOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBit(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (s === '1' || s === 'true') return 1;
  if (s === '0' || s === 'false') return 0;
  return null;
}

function toTrimmedOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function getField(row, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const v = toTrimmedOrNull(row[k]);
      if (v !== null) return v;
    }
  }
  return null;
}

function parseDateOrNull(v) {
  const s = toTrimmedOrNull(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function requireCompanyId(req, res) {
  const companyId = req.user?.company_id ? parseInt(req.user.company_id, 10) : null;
  if (!companyId) {
    res.status(400).json({ status: 'error', message: 'Company context missing in token' });
    return null;
  }
  return companyId;
}

function mapSqlErrorToHttp(error) {
  const msg = error?.message || '';
  const isOverlap = /Overlapping gas rate already exists/i.test(msg);
  const isInvalidOwnership = /Invalid OwnershipType/i.test(msg);
  const isBadClose = /EffectiveTo cannot be earlier than EffectiveFrom/i.test(msg);
  const isNotFoundActive = /Active gas rate not found for this company/i.test(msg);
  const isNotFound = /not found/i.test(msg);

  return {
    status: isOverlap ? 409 : isInvalidOwnership ? 400 : isBadClose ? 400 : (isNotFoundActive || isNotFound) ? 404 : 500,
    message: msg || 'Request failed'
  };
}

/**
 * @swagger
 * tags:
 *   name: PartyGasRates
 *   description: Party Gas Rate master endpoints
 */

/**
 * @swagger
 * /api/v1/party-gas-rates:
 *   get:
 *     summary: List Party Gas Rates (dbo.sp_PartyGasRate_GetAll)
 *     tags: [PartyGasRates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: party_id
 *         required: false
 *         schema: { type: integer, nullable: true }
 *         description: If omitted/null, returns default rates (PartyID NULL)
 *       - in: query
 *         name: gas_type_id
 *         required: false
 *         schema: { type: integer, nullable: true }
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
 *     responses:
 *       200: { description: Party gas rates list }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;

    // default partyId = null => show default rates (PartyID NULL)
    const partyId = toInt(req.query.party_id ?? req.query.partyId);
    const gasTypeId = toInt(req.query.gas_type_id ?? req.query.gasTypeId);

    const activeRaw = req.query.active;
    let active = 1;
    if (activeRaw !== undefined && activeRaw !== null && String(activeRaw).trim().toLowerCase() === 'all') {
      active = null;
    } else {
      const b = toBit(activeRaw);
      active = b === null ? 1 : b;
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('PartyID', sql.Int, partyId)
      .input('GasTypeID', sql.Int, gasTypeId)
      .input('IsActive', sql.Bit, active === null ? null : Boolean(active))
      .execute('dbo.sp_PartyGasRate_GetAll');

    return res.status(200).json({ status: 'success', data: result.recordset || [] });
  } catch (error) {
    console.error('Error listing party gas rates:', error);
    const mapped = mapSqlErrorToHttp(error);
    return res.status(mapped.status).json({ status: 'error', message: mapped.message });
  }
});

/**
 * @swagger
 * /api/v1/party-gas-rates/upload:
 *   post:
 *     summary: Bulk upload Party Gas Rates (Gas Cost) from CSV
 *     tags: [PartyGasRates]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload a CSV file to create Party Gas Rate rows using dbo.sp_PartyGasRate_Create per row.
 *       CompanyID is taken from the login token. Party lookups are branch-scoped (PartyMaster uses CompanyID+BranchID+CustCode).
 *
 *       Recommended CSV columns (case-insensitive headers are NOT supported; use exact headers below):
 *       - party_code (optional; blank/NULL = default rate)
 *       - gas_code (required)
 *       - cylinder_family_code (optional; blank = NULL)
 *       - uom_code (required)
 *       - ownership_type (required; OWN or PARTY)
 *       - rate (required)
 *       - currency (optional; default INR)
 *       - effective_from (required; YYYY-MM-DD)
 *       - effective_to (optional; blank = open-ended/NULL)
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               branch_id:
 *                 type: integer
 *                 nullable: true
 *                 description: Optional; used only when party_code is provided and token lacks branch_id.
 *     responses:
 *       200:
 *         description: Upload summary (partial success supported)
 *       400:
 *         description: Bad request (no file / invalid file / missing context)
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded. Please upload a CSV file.' });
    }

    filePath = req.file.path;

    const companyId = requireCompanyId(req, res);
    if (!companyId) {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    const tokenBranchId = req.user?.branch_id ? parseInt(req.user.branch_id, 10) : null;
    const bodyBranchId = toInt(req.body.branch_id ?? req.body.branchId);
    const branchId = tokenBranchId || bodyBranchId || null;

    // Parse CSV file into rows
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file after parsing
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    filePath = null;

    if (!rows.length) {
      return res.status(400).json({ status: 'error', message: 'No data found in the uploaded file' });
    }

    const pool = await getPool();
    const createdBy = req.user?.user_id ? String(req.user.user_id) : null;

    const results = {
      total: rows.length,
      inserted: 0,
      failed: 0,
      errors: [],
      insertedRecords: []
    };

    // Cache code->id lookups to avoid repeated queries
    const gasTypeCache = new Map(); // gas_code -> gas_type_id
    const uomCache = new Map(); // uom_code -> unit_of_measure_id
    const cfCache = new Map(); // cylinder_family_code -> cylinder_family_id
    const partyCache = new Map(); // `${branchId}:${party_code}` -> party_id

    // Preload UOMs once (UOMs are typically small)
    try {
      const uomResult = await pool.request()
        .input('IncludeInactive', sql.Bit, false)
        .execute('dbo.sp_UnitOfMeasure_GetAll');
      for (const r of (uomResult.recordset || [])) {
        const code = (r.UOMCode ?? r.uom_code ?? '').toString().trim().toUpperCase();
        const id = r.UnitOfMeasureID ?? r.unit_of_measure_id ?? null;
        const isActive = r.IsActive ?? r.is_active ?? true;
        if (code && id && (isActive === true || isActive === 1)) {
          uomCache.set(code, id);
        }
      }
    } catch (e) {
      // If preload fails, we'll still try to resolve UOMs on-demand below.
      console.warn('UOM preload failed for upload:', e?.message || e);
    }

    async function resolveGasTypeId(gasCode) {
      const key = gasCode.toUpperCase();
      if (gasTypeCache.has(key)) return gasTypeCache.get(key);
      // Use stored procedure (same behavior as GET /gas-types) to avoid schema mismatches
      const r = await pool.request()
        .input('CompanyID', sql.Int, companyId)
        .input('Active', sql.Bit, true)
        .input('Search', sql.NVarChar(100), key)
        .execute('dbo.sp_GasType_Search_ByCompany');
      const match = (r.recordset || []).find((x) => String(x.gas_code ?? x.GasCode ?? '').trim().toUpperCase() === key);
      const id = match ? (match.gas_type_id ?? match.GasTypeID ?? null) : null;
      gasTypeCache.set(key, id);
      return id;
    }

    async function resolveUomId(uomCode) {
      const key = uomCode.toUpperCase();
      if (uomCache.has(key)) return uomCache.get(key);
      // Fallback: query SP and cache (in case preload failed)
      const r = await pool.request()
        .input('IncludeInactive', sql.Bit, false)
        .execute('dbo.sp_UnitOfMeasure_GetAll');
      for (const x of (r.recordset || [])) {
        const c = (x.UOMCode ?? x.uom_code ?? '').toString().trim().toUpperCase();
        const id = x.UnitOfMeasureID ?? x.unit_of_measure_id ?? null;
        const isActive = x.IsActive ?? x.is_active ?? true;
        if (c && id && (isActive === true || isActive === 1)) uomCache.set(c, id);
      }
      const id = uomCache.get(key) ?? null;
      uomCache.set(key, id);
      return id;
    }

    async function resolveCylinderFamilyId(codeOrNull) {
      if (!codeOrNull) return null;
      const key = codeOrNull.toUpperCase();
      if (cfCache.has(key)) return cfCache.get(key);
      // Use stored procedure (same behavior as GET /cylinder-families)
      const r = await pool.request()
        .input('CompanyID', sql.Int, companyId)
        .input('Active', sql.Bit, true)
        .input('Search', sql.NVarChar(200), key)
        .execute('dbo.sp_CylinderFamily_GetList');
      const match = (r.recordset || []).find((x) => String(x.cylinder_family_code ?? x.CylinderFamilyCode ?? '').trim().toUpperCase() === key);
      const id = match ? (match.cylinder_family_id ?? match.CylinderFamilyID ?? null) : null;
      cfCache.set(key, id);
      return id;
    }

    async function resolvePartyId(partyCode) {
      if (!partyCode) return null;
      if (!branchId) return null;
      const key = `${branchId}:${partyCode.toUpperCase()}`;
      if (partyCache.has(key)) return partyCache.get(key);
      const r = await pool.request()
        .input('CompanyID', sql.Int, companyId)
        .input('BranchID', sql.Int, branchId)
        .input('Code', sql.NVarChar(50), partyCode.toUpperCase())
        .query(`SELECT TOP 1 PartyID as id FROM dbo.PartyMaster WHERE CompanyID=@CompanyID AND BranchID=@BranchID AND CustCode=@Code AND IsActive=1 ORDER BY PartyID DESC`);
      const id = r.recordset?.[0]?.id ?? null;
      partyCache.set(key, id);
      return id;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because CSV row 1 is header

      try {
        const party_code = getField(row, ['party_code', 'partyCode', 'cust_code', 'custCode']);
        const gas_code = getField(row, ['gas_code', 'gasCode']);
        const cylinder_family_code = getField(row, ['cylinder_family_code', 'cylinderFamilyCode']);
        const uom_code = getField(row, ['uom_code', 'uomCode']);
        const ownership_type_raw = getField(row, ['ownership_type', 'ownershipType']);
        const rate_raw = getField(row, ['rate']);
        const currency = getField(row, ['currency']) || 'INR';
        const effective_from_raw = getField(row, ['effective_from', 'effectiveFrom']);
        const effective_to_raw = getField(row, ['effective_to', 'effectiveTo']);

        // Skip fully empty rows
        if (!party_code && !gas_code && !cylinder_family_code && !uom_code && !ownership_type_raw && !rate_raw && !effective_from_raw) {
          results.total--; // don't count empty row
          continue;
        }

        if (!gas_code || !uom_code || !ownership_type_raw || !rate_raw || !effective_from_raw) {
          throw new Error('gas_code, uom_code, ownership_type, rate, effective_from are required');
        }

        const ownership_type = String(ownership_type_raw).trim().toUpperCase();
        if (ownership_type !== 'OWN' && ownership_type !== 'PARTY') {
          throw new Error('ownership_type must be OWN or PARTY');
        }

        const rate = Number(rate_raw);
        if (!Number.isFinite(rate)) {
          throw new Error('rate must be a valid number');
        }

        const effective_from = parseDateOrNull(effective_from_raw);
        if (!effective_from) {
          throw new Error('effective_from must be a valid date (YYYY-MM-DD recommended)');
        }
        const effective_to = parseDateOrNull(effective_to_raw);
        if (effective_to) {
          const fromD = new Date(effective_from);
          const toD = new Date(effective_to);
          if (toD < fromD) {
            throw new Error('effective_to cannot be earlier than effective_from');
          }
        }

        if (party_code && !branchId) {
          throw new Error('branch_id is required (in token or form-data) when party_code is provided');
        }

        // Resolve codes to IDs
        const gas_type_id = await resolveGasTypeId(gas_code);
        if (!gas_type_id) throw new Error(`Invalid gas_code: ${gas_code}`);

        const unit_of_measure_id = await resolveUomId(uom_code);
        if (!unit_of_measure_id) throw new Error(`Invalid uom_code: ${uom_code}`);

        const cylinder_family_id = await resolveCylinderFamilyId(cylinder_family_code);
        if (cylinder_family_code && !cylinder_family_id) throw new Error(`Invalid cylinder_family_code: ${cylinder_family_code}`);

        const party_id = await resolvePartyId(party_code);
        if (party_code && !party_id) throw new Error(`Invalid party_code: ${party_code}`);

        // Execute SP per row (DB enforces overlap/duplicate constraints)
        const spRes = await pool.request()
          .input('CompanyID', sql.Int, companyId)
          .input('PartyID', sql.Int, party_id)
          .input('GasTypeID', sql.Int, gas_type_id)
          .input('CylinderFamilyID', sql.Int, cylinder_family_id)
          .input('UnitOfMeasureID', sql.Int, unit_of_measure_id)
          .input('OwnershipType', sql.NVarChar(10), ownership_type)
          .input('Rate', sql.Decimal(12, 2), rate)
          .input('Currency', sql.NVarChar(10), currency)
          .input('EffectiveFrom', sql.Date, effective_from)
          .input('EffectiveTo', sql.Date, effective_to || null)
          .input('CreatedBy', sql.NVarChar(100), createdBy)
          .execute('dbo.sp_PartyGasRate_Create');

        const party_gas_rate_id =
          spRes.recordset?.[0]?.party_gas_rate_id ??
          spRes.recordset?.[0]?.PartyGasRateID ??
          spRes.recordset?.[0]?.partyGasRateId ??
          null;

        results.inserted++;
        results.insertedRecords.push({
          party_gas_rate_id,
          party_code: party_code || null,
          gas_code,
          cylinder_family_code: cylinder_family_code || null,
          uom_code,
          ownership_type,
          effective_from,
          effective_to: effective_to || null
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          party_code: row.party_code ?? row.cust_code ?? null,
          gas_code: row.gas_code ?? null,
          cylinder_family_code: row.cylinder_family_code ?? null,
          uom_code: row.uom_code ?? null,
          error: (error && error.message) ? error.message : String(error || 'Row failed')
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Upload complete. ${results.inserted} row(s) inserted successfully, ${results.failed} failed.`,
      data: {
        total: results.total,
        inserted: results.inserted,
        failed: results.failed,
        errors: results.errors.slice(0, 10),
        insertedRecords: results.insertedRecords
      }
    });
  } catch (error) {
    console.error('Upload party gas rates error:', error);
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }
    const mapped = mapSqlErrorToHttp(error);
    return res.status(mapped.status || 500).json({ status: 'error', message: mapped.message || 'Failed to upload party gas rates' });
  }
});

/**
 * @swagger
 * /api/v1/party-gas-rates/{id}:
 *   get:
 *     summary: Get Party Gas Rate by ID (dbo.sp_PartyGasRate_GetByID)
 *     tags: [PartyGasRates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Party gas rate }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;

    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('PartyGasRateID', sql.Int, id)
      .execute('dbo.sp_PartyGasRate_GetByID');

    const row = result.recordset?.[0];
    if (!row) return res.status(404).json({ status: 'error', message: 'Gas rate not found' });
    return res.status(200).json({ status: 'success', data: row });
  } catch (error) {
    console.error('Error fetching party gas rate:', error);
    const mapped = mapSqlErrorToHttp(error);
    return res.status(mapped.status).json({ status: 'error', message: mapped.message });
  }
});

/**
 * @swagger
 * /api/v1/party-gas-rates:
 *   post:
 *     summary: Create Party Gas Rate (dbo.sp_PartyGasRate_Create)
 *     tags: [PartyGasRates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gas_type_id, unit_of_measure_id, ownership_type, rate, effective_from]
 *             properties:
 *               party_id: { type: integer, nullable: true, description: "NULL = default rate" }
 *               gas_type_id: { type: integer }
 *               cylinder_family_id: { type: integer, nullable: true }
 *               unit_of_measure_id: { type: integer }
 *               ownership_type: { type: string, enum: [OWN, PARTY] }
 *               rate: { type: number }
 *               currency: { type: string, default: INR }
 *               effective_from: { type: string, format: date }
 *               effective_to: { type: string, format: date, nullable: true, description: "NULL = open-ended" }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Overlapping gas rate }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;

    const party_id = toInt(req.body.party_id ?? req.body.partyId);
    const gas_type_id = toInt(req.body.gas_type_id ?? req.body.gasTypeId);
    const cylinder_family_id = toInt(req.body.cylinder_family_id ?? req.body.cylinderFamilyId);
    const unit_of_measure_id = toInt(req.body.unit_of_measure_id ?? req.body.unitOfMeasureId);
    const ownership_type = (req.body.ownership_type ?? req.body.ownershipType ?? '').trim().toUpperCase();
    const rate = toDecimalOrNull(req.body.rate);
    const currency = (req.body.currency ?? 'INR').toString().trim();
    const effective_from = (req.body.effective_from ?? req.body.effectiveFrom ?? '').toString().trim();
    const effective_to_raw = req.body.effective_to ?? req.body.effectiveTo ?? null;
    const effective_to = effective_to_raw ? String(effective_to_raw).trim() : null;

    if (!gas_type_id || !unit_of_measure_id || !ownership_type || rate === null || !effective_from) {
      return res.status(400).json({
        status: 'error',
        message: 'gas_type_id, unit_of_measure_id, ownership_type, rate, effective_from are required (effective_to optional)'
      });
    }

    const createdBy = req.user?.user_id ? String(req.user.user_id) : (req.body.created_by ?? null);

    const pool = await getPool();
    const result = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('PartyID', sql.Int, party_id)
      .input('GasTypeID', sql.Int, gas_type_id)
      .input('CylinderFamilyID', sql.Int, cylinder_family_id)
      .input('UnitOfMeasureID', sql.Int, unit_of_measure_id)
      .input('OwnershipType', sql.NVarChar(10), ownership_type)
      .input('Rate', sql.Decimal(12, 2), rate)
      .input('Currency', sql.NVarChar(10), currency)
      .input('EffectiveFrom', sql.Date, effective_from)
      .input('EffectiveTo', sql.Date, effective_to || null)
      .input('CreatedBy', sql.NVarChar(100), createdBy)
      .execute('dbo.sp_PartyGasRate_Create');

    const party_gas_rate_id =
      result.recordset?.[0]?.party_gas_rate_id ??
      result.recordset?.[0]?.PartyGasRateID ??
      result.recordset?.[0]?.partyGasRateId;

    return res.status(201).json({
      status: 'success',
      message: 'Gas rate created successfully',
      data: { party_gas_rate_id }
    });
  } catch (error) {
    console.error('Error creating party gas rate:', error);
    const mapped = mapSqlErrorToHttp(error);
    return res.status(mapped.status).json({ status: 'error', message: mapped.message });
  }
});

/**
 * @swagger
 * /api/v1/party-gas-rates/{id}:
 *   put:
 *     summary: Close/Deactivate Party Gas Rate (dbo.sp_PartyGasRate_Update)
 *     tags: [PartyGasRates]
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
 *             required: [is_active]
 *             properties:
 *               effective_to: { type: string, format: date, nullable: true, description: "Close date (optional). NULL keeps open-ended." }
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;

    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    // Disallow changing dimensions or rewriting price history via update
    const forbiddenKeys = [
      'gas_type_id', 'gasTypeId',
      'cylinder_family_id', 'cylinderFamilyId',
      'party_id', 'partyId',
      'ownership_type', 'ownershipType',
      'company_id', 'companyId',
      'rate', 'currency',
      'effective_from', 'effectiveFrom',
      'unit_of_measure_id', 'unitOfMeasureId'
    ];
    const hasForbidden = forbiddenKeys.some((k) => Object.prototype.hasOwnProperty.call(req.body || {}, k));
    if (hasForbidden) {
      // If you want to allow them when unchanged, we can fetch+compare, but requirement says "DO NOT allow changing".
      return res.status(400).json({
        status: 'error',
        message: 'Update is only for closing/deactivating a rate (effective_to, is_active). For price change, create a new row.'
      });
    }

    const effective_to_raw = req.body.effective_to ?? req.body.effectiveTo ?? null;
    const effective_to = effective_to_raw ? String(effective_to_raw).trim() : null;
    const is_active = req.body.is_active;

    if (is_active === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'is_active is required (effective_to optional)'
      });
    }

    const updatedBy = req.user?.user_id ? String(req.user.user_id) : (req.body.updated_by ?? null);

    const pool = await getPool();

    // Ensure record exists and belongs to company
    const existing = await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('PartyGasRateID', sql.Int, id)
      .execute('dbo.sp_PartyGasRate_GetByID');
    if (!existing.recordset?.length) {
      return res.status(404).json({ status: 'error', message: 'Gas rate not found' });
    }

    await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('PartyGasRateID', sql.Int, id)
      .input('EffectiveTo', sql.Date, effective_to || null)
      .input('IsActive', sql.Bit, Boolean(is_active))
      .input('UpdatedBy', sql.NVarChar(100), updatedBy)
      .execute('dbo.sp_PartyGasRate_Update');

    return res.status(200).json({ status: 'success', message: 'Gas rate updated successfully' });
  } catch (error) {
    console.error('Error updating party gas rate:', error);
    const mapped = mapSqlErrorToHttp(error);
    return res.status(mapped.status).json({ status: 'error', message: mapped.message });
  }
});

/**
 * @swagger
 * /api/v1/party-gas-rates/{id}:
 *   delete:
 *     summary: Deactivate Party Gas Rate (dbo.sp_PartyGasRate_Deactivate)
 *     tags: [PartyGasRates]
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
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;

    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid id' });

    const deactivatedBy = req.user?.user_id ? String(req.user.user_id) : (req.body?.deactivated_by ?? req.body?.updated_by ?? null);

    const pool = await getPool();
    await pool.request()
      .input('CompanyID', sql.Int, companyId)
      .input('PartyGasRateID', sql.Int, id)
      .input('DeactivatedBy', sql.NVarChar(100), deactivatedBy)
      .execute('dbo.sp_PartyGasRate_Deactivate');

    return res.status(200).json({ success: true, message: 'Gas rate deactivated' });
  } catch (error) {
    console.error('Error deactivating party gas rate:', error);
    const mapped = mapSqlErrorToHttp(error);
    return res.status(mapped.status).json({ status: 'error', message: mapped.message });
  }
});

module.exports = router;

