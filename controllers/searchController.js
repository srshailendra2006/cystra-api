const { sql, getPool } = require('../db');

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function clampInt(v, min, max, fallback) {
  const n = toInt(v);
  if (n === null) return fallback;
  return Math.max(min, Math.min(max, n));
}

class SearchController {
  async search(req, res) {
    try {
      const qRaw = (req.query.q || '').trim();
      if (!qRaw) {
        return res.status(400).json({ status: 'error', message: 'q is required' });
      }

      const limit = clampInt(req.query.limit, 1, 50, 10);

      const tokenCompany = req.user?.company_id ?? null;
      const tokenBranch = req.user?.branch_id ?? null;
      const permission = req.user?.permission_level ?? 10;

      const requestedCompany = toInt(req.query.company_id);
      const requestedBranch = toInt(req.query.branch_id);

      const company_id = requestedCompany ?? tokenCompany;
      if (!company_id) {
        return res.status(400).json({ status: 'error', message: 'company_id is required (or must be present in token)' });
      }

      // RBAC: prevent cross-company search for non-super roles
      if (tokenCompany && requestedCompany && requestedCompany !== tokenCompany && permission < 100) {
        return res.status(403).json({ status: 'error', message: 'Forbidden (cross-company search not allowed)' });
      }

      // RBAC: prevent cross-branch search for lower roles
      if (tokenBranch && requestedBranch && requestedBranch !== tokenBranch && permission < 50) {
        return res.status(403).json({ status: 'error', message: 'Forbidden (cross-branch search not allowed)' });
      }

      // Effective branch scoping: if user is branch-scoped (permission < 50), force their branch.
      const branch_id = requestedBranch ?? (permission < 50 ? tokenBranch : null);

      const like = `%${qRaw}%`;
      const pool = await getPool();

      // Cylinders (barcode, serial, cylinder_code)
      const cylindersQ = await pool.request()
        .input('limit', sql.Int, limit)
        .input('company_id', sql.Int, company_id)
        .input('branch_id', sql.Int, branch_id)
        .input('q', sql.NVarChar(255), like)
        .query(`
          SELECT TOP (@limit)
            id,
            cylinder_code,
            barcode_number,
            serial_number
          FROM cylinders
          WHERE company_id = @company_id
            AND ISNULL(is_active, 1) = 1
            AND (@branch_id IS NULL OR branch_id = @branch_id)
            AND (
              cylinder_code LIKE @q OR
              serial_number LIKE @q OR
              barcode_number LIKE @q
            )
          ORDER BY created_at DESC
        `);

      // Users (username/email/first_name/last_name)
      const usersQ = await pool.request()
        .input('limit', sql.Int, limit)
        .input('company_id', sql.Int, company_id)
        .input('branch_id', sql.Int, branch_id)
        .input('q', sql.NVarChar(255), like)
        .query(`
          SELECT TOP (@limit)
            id,
            first_name,
            last_name,
            email,
            username
          FROM users
          WHERE company_id = @company_id
            AND ISNULL(is_active, 1) = 1
            AND (@branch_id IS NULL OR branch_id = @branch_id)
            AND (
              username LIKE @q OR
              email LIKE @q OR
              first_name LIKE @q OR
              last_name LIKE @q
            )
          ORDER BY created_at DESC
        `);

      // Branches (company-scoped)
      const branchesQ = await pool.request()
        .input('limit', sql.Int, limit)
        .input('company_id', sql.Int, company_id)
        .input('q', sql.NVarChar(255), like)
        .query(`
          SELECT TOP (@limit)
            id,
            branch_name,
            branch_code
          FROM branches
          WHERE company_id = @company_id
            AND ISNULL(is_active, 1) = 1
            AND (branch_name LIKE @q OR branch_code LIKE @q)
          ORDER BY branch_name ASC
        `);

      // Companies
      let companies = [];
      if (permission >= 100) {
        const companiesQ = await pool.request()
          .input('limit', sql.Int, limit)
          .input('q', sql.NVarChar(255), like)
          .query(`
            SELECT TOP (@limit)
              id,
              company_name,
              company_code
            FROM companies
            WHERE ISNULL(is_active, 1) = 1
              AND (company_name LIKE @q OR company_code LIKE @q)
            ORDER BY company_name ASC
          `);
        companies = companiesQ.recordset || [];
      } else {
        const companiesQ = await pool.request()
          .input('company_id', sql.Int, company_id)
          .input('q', sql.NVarChar(255), like)
          .query(`
            SELECT
              id,
              company_name,
              company_code
            FROM companies
            WHERE id = @company_id
              AND ISNULL(is_active, 1) = 1
              AND (company_name LIKE @q OR company_code LIKE @q)
          `);
        companies = companiesQ.recordset || [];
      }

      return res.status(200).json({
        status: 'success',
        data: {
          cylinders: cylindersQ.recordset || [],
          users: usersQ.recordset || [],
          branches: branchesQ.recordset || [],
          companies
        }
      });
    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({ status: 'error', message: 'Failed to search' });
    }
  }
}

module.exports = new SearchController();
