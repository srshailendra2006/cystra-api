const cylinderService = require('../services/cylinderService');
const csv = require('csv-parser');
const fs = require('fs');

function parseTestNotes(notes) {
  if (!notes) return null;
  if (typeof notes !== 'string') return null;
  const trimmed = notes.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
}

function buildTestNotesFromBody(body) {
  const payload = {
    tare_weight: body.tare_weight ?? null,
    reference_number: body.reference_number ?? null,
    permission_number: body.permission_number ?? null,
    permission_date: body.permission_date ?? null,
    water_filling_capacity: body.water_filling_capacity ?? null,
    remarks: body.remarks ?? null
  };

  // If user didn't provide any of these fields, don't force JSON notes.
  const hasAny = Object.values(payload).some(v => v !== null && v !== undefined && v !== '');
  if (!hasAny) return body.notes ?? body.test_notes ?? null;

  return JSON.stringify(payload);
}

function normalizeTestResult(input) {
  if (!input) return null;
  const v = String(input).trim();
  if (!v) return null;
  const upper = v.toUpperCase();
  if (upper === 'FINE' || upper === 'OK' || upper === 'PASS' || upper === 'PASSED') return 'Pass';
  if (upper === 'FAIL' || upper === 'FAILED' || upper === 'NOT OK' || upper === 'NOT_OK') return 'Fail';
  if (upper === 'CONDITIONAL' || upper === 'COND') return 'Conditional';
  return v;
}

class CylinderController {
  /**
   * Create a new cylinder
   */
  async createCylinder(req, res) {
    try {
      // Use logged-in user's info if available, otherwise from request body
      const cylinderData = {
        company_id: parseInt(req.body.company_id) || req.user?.company_id,
        branch_id: parseInt(req.body.branch_id) || req.user?.branch_id,
        cylinder_code: req.body.cylinder_code,
        serial_number: req.body.serial_number,
        barcode_number: req.body.barcode_number,
        cylinder_type: req.body.cylinder_type,
        cylinder_family_code: req.body.cylinder_family_code ?? null,
        gas_content: req.body.gas_content ?? null,
        manufacture_no: req.body.manufacture_no ?? null,
        challan_no: req.body.challan_no ?? null,
        capacity: req.body.capacity,
        capacity_unit: req.body.capacity_unit,
        manufacturer: req.body.manufacturer,
        manufacture_date: req.body.manufacture_date,
        last_test_date: req.body.last_test_date,
        next_test_date: req.body.next_test_date,
        status: req.body.status,
        owner_type: req.body.owner_type,
        owner_party_id:
          req.body.owner_party_id !== undefined &&
          req.body.owner_party_id !== null &&
          req.body.owner_party_id !== ''
            ? parseInt(req.body.owner_party_id)
            : null,
        current_holder_party_id:
          req.body.current_holder_party_id !== undefined &&
          req.body.current_holder_party_id !== null &&
          req.body.current_holder_party_id !== ''
            ? parseInt(req.body.current_holder_party_id)
            : null,
        ownership_remarks: req.body.ownership_remarks ?? null,
        created_by: req.user?.user_id || req.body.created_by || null,
        
        // Optional Test Data (will auto-create test record in cylinder_tests table)
        test_date: req.body.test_date,
        test_type: req.body.test_type,
        test_pressure: req.body.test_pressure,
        test_result: req.body.test_result,
        inspector_name: req.body.inspector_name,
        test_notes: req.body.test_notes,
        tested_by: req.user?.user_id || req.body.tested_by || null
      };

      const result = await cylinderService.createCylinder(cylinderData);

      res.status(201).json({
        status: 'success',
        message: result.test_id 
          ? 'Cylinder and test record created successfully' 
          : 'Cylinder created successfully',
        data: {
          cylinder_id: result.cylinder_id,
          test_id: result.test_id || null,
          test_record_created: !!result.test_id
        }
      });
    } catch (error) {
      console.error('Create cylinder error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to create cylinder'
      });
    }
  }

  /**
   * Get cylinder by ID
   */
  async getCylinderById(req, res) {
    try {
      const { id } = req.params;
      const { company_id, branch_id } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const cylinder = await cylinderService.getCylinderById(
        parseInt(id),
        parseInt(company_id),
        parseInt(branch_id)
      );

      res.status(200).json({
        status: 'success',
        data: cylinder
      });
    } catch (error) {
      console.error('Get cylinder error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get cylinder'
      });
    }
  }

  /**
   * Get all cylinders with pagination and filters
   */
  async getCylinders(req, res) {
    try {
      const {
        company_id,
        branch_id,
        page = 1,
        limit = 10,
        search,
        status,
        is_active
      } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const filters = {
        company_id: parseInt(company_id),
        branch_id: parseInt(branch_id),
        page_number: parseInt(page),
        page_size: parseInt(limit),
        search_term: search || null,
        status: status || null,
        is_active: is_active !== undefined ? is_active === 'true' : null
      };

      // Service now returns { data: [...], totalCount: number }
      const result = await cylinderService.getCylinders(filters);
      const cylinders = result.data || [];
      const totalCount = result.totalCount || cylinders.length;

      res.status(200).json({
        status: 'success',
        data: cylinders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,  // Total count across all pages
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get cylinders error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get cylinders'
      });
    }
  }

  /**
   * Update cylinder
   */
  async updateCylinder(req, res) {
    try {
      const { id } = req.params;
      const { company_id, branch_id } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const updateData = {
        cylinder_code: req.body.cylinder_code,
        serial_number: req.body.serial_number,
        barcode_number: req.body.barcode_number,
        cylinder_type: req.body.cylinder_type,
        cylinder_family_code: req.body.cylinder_family_code,
        gas_content: req.body.gas_content,
        manufacture_no: req.body.manufacture_no,
        challan_no: req.body.challan_no,
        capacity: req.body.capacity,
        capacity_unit: req.body.capacity_unit,
        manufacturer: req.body.manufacturer,
        manufacture_date: req.body.manufacture_date,
        last_test_date: req.body.last_test_date,
        next_test_date: req.body.next_test_date,
        status: req.body.status,
        owner_type: req.body.owner_type,
        owner_party_id:
          req.body.owner_party_id !== undefined &&
          req.body.owner_party_id !== null &&
          req.body.owner_party_id !== ''
            ? parseInt(req.body.owner_party_id)
            : null,
        current_holder_party_id:
          req.body.current_holder_party_id !== undefined &&
          req.body.current_holder_party_id !== null &&
          req.body.current_holder_party_id !== ''
            ? parseInt(req.body.current_holder_party_id)
            : null,
        ownership_remarks: req.body.ownership_remarks,
        is_active: req.body.is_active
      };

      const result = await cylinderService.updateCylinder(
        parseInt(id),
        parseInt(company_id),
        parseInt(branch_id),
        updateData
      );

      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Update cylinder error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to update cylinder'
      });
    }
  }

  /**
   * Delete cylinder
   */
  async deleteCylinder(req, res) {
    try {
      const { id } = req.params;
      const { company_id, branch_id } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const result = await cylinderService.deleteCylinder(
        parseInt(id),
        parseInt(company_id),
        parseInt(branch_id)
      );

      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Delete cylinder error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to delete cylinder'
      });
    }
  }

  /**
   * Get cylinder by code
   */
  async getCylinderByCode(req, res) {
    try {
      const { code } = req.params;
      const { company_id, branch_id } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const cylinder = await cylinderService.getCylinderByCode(
        code,
        parseInt(company_id),
        parseInt(branch_id)
      );

      res.status(200).json({
        status: 'success',
        data: cylinder
      });
    } catch (error) {
      console.error('Get cylinder by code error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get cylinder'
      });
    }
  }

  /**
   * Get cylinder by serial number
   */
  async getCylinderBySerialNumber(req, res) {
    try {
      const { serial } = req.params;
      const { company_id, branch_id } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const cylinder = await cylinderService.getCylinderBySerialNumber(
        serial,
        parseInt(company_id),
        parseInt(branch_id)
      );

      res.status(200).json({
        status: 'success',
        data: cylinder
      });
    } catch (error) {
      console.error('Get cylinder by serial error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get cylinder'
      });
    }
  }

  /**
   * Get cylinder statistics
   */
  async getCylinderStats(req, res) {
    try {
      const { company_id, branch_id } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const stats = await cylinderService.getCylinderStats(
        parseInt(company_id),
        parseInt(branch_id)
      );

      res.status(200).json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      console.error('Get cylinder stats error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get statistics'
      });
    }
  }

  /**
   * Get cylinders due for test
   */
  async getCylindersDueForTest(req, res) {
    try {
      const { company_id, branch_id, days = 30 } = req.query;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const cylinders = await cylinderService.getCylindersDueForTest(
        parseInt(company_id),
        parseInt(branch_id),
        parseInt(days)
      );

      res.status(200).json({
        status: 'success',
        data: cylinders
      });
    } catch (error) {
      console.error('Get cylinders due for test error:', error);
      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get cylinders due for test'
      });
    }
  }

  /**
   * Get testing history for a cylinder
   * GET /api/v1/cylinders/:cylinderId/tests
   */
  async getCylinderTests(req, res) {
    try {
      const { cylinderId } = req.params;
      const company_id = parseInt(req.query.company_id) || req.user?.company_id;
      const branch_id = req.query.branch_id ? parseInt(req.query.branch_id) : (req.user?.branch_id ?? null);
      const test_type = req.query.test_type || null;

      if (!company_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID is required (company_id)'
        });
      }

      const rows = await cylinderService.getCylinderTests({
        company_id,
        branch_id,
        cylinder_id: parseInt(cylinderId),
        test_type
      });

      const data = (rows || []).map(r => {
        const parsed = parseTestNotes(r.notes);
        const remarks = r.remarks ?? parsed?.remarks ?? r.notes ?? null;
        return {
          test_id: r.id,
          test_status: r.test_result ?? null,
          test_date: r.test_date ?? null,
          tester_name: r.inspector_name || r.tested_by_name || null,
          tare_weight: r.tare_weight ?? parsed?.tare_weight ?? null,
          reference_number: r.reference_number ?? parsed?.reference_number ?? null,
          permission_number: r.permission_number ?? parsed?.permission_number ?? null,
          permission_date: r.permission_date ?? parsed?.permission_date ?? null,
          water_filling_capacity: r.water_filling_capacity ?? parsed?.water_filling_capacity ?? null,
          remarks,
          created_at: r.created_at ?? null,
          // also include native fields for debugging/compatibility
          test_type: r.test_type ?? null,
          test_pressure: r.test_pressure ?? null,
          next_test_date: r.next_test_date ?? null
        };
      });

      return res.status(200).json({
        status: 'success',
        data
      });
    } catch (error) {
      console.error('Get cylinder tests error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get cylinder tests'
      });
    }
  }

  /**
   * Add new testing record for a cylinder
   * POST /api/v1/cylinders/:cylinderId/tests
   */
  async addCylinderTest(req, res) {
    try {
      const { cylinderId } = req.params;
      const company_id = parseInt(req.body.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.body.branch_id) || req.user?.branch_id;

      if (!company_id || !branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      const testResultNormalized = normalizeTestResult(req.body.test_status || req.body.test_result);
      if (!testResultNormalized) {
        return res.status(400).json({
          status: 'error',
          message: 'test_status (or test_result) is required'
        });
      }

      const testData = {
        company_id,
        branch_id,
        cylinder_id: parseInt(cylinderId),
        test_date: req.body.test_date,
        // Map request "test_status" to DB "test_result"
        test_result: testResultNormalized,
        // Map request "tester_name" to DB "inspector_name"
        inspector_name: req.body.tester_name || req.body.inspector_name || null,
        // Optional fields supported by DB
        test_type: req.body.test_type || 'Hydrostatic',
        test_pressure: req.body.test_pressure ?? null,
        next_test_date: req.body.next_test_date || null,
        tested_by: req.user?.user_id || req.body.tested_by || null,
        // New columns in cylinder_tests
        tare_weight: req.body.tare_weight ?? null,
        reference_number: req.body.reference_number || null,
        permission_number: req.body.permission_number || null,
        permission_date: req.body.permission_date || null,
        water_filling_capacity: req.body.water_filling_capacity ?? null,
        remarks: req.body.remarks || null,
        // Keep notes optional (for any extra unstructured info)
        notes: req.body.notes ?? req.body.test_notes ?? null
      };

      const result = await cylinderService.addCylinderTest(testData);

      return res.status(201).json({
        status: 'success',
        message: result.message || 'Cylinder test recorded successfully',
        data: {
          test_id: result.test_id
        }
      });
    } catch (error) {
      console.error('Add cylinder test error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to add cylinder test'
      });
    }
  }

  /**
   * Upload cylinders from CSV/Excel file
   */
  async uploadCylinders(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded. Please upload a CSV file.'
        });
      }

      // Get company and branch from request body (or from logged-in user)
      const company_id = parseInt(req.body.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.body.branch_id) || req.user?.branch_id;
      const created_by = req.user?.user_id || parseInt(req.body.created_by) || null;

      if (!company_id || !branch_id) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          status: 'error',
          message: 'Company ID and Branch ID are required'
        });
      }

      // Parse CSV file
      const cylindersData = [];
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            cylindersData.push(row);
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (error) => {
            reject(error);
          });
      });

      // Clean up uploaded file after parsing
      fs.unlinkSync(req.file.path);

      if (cylindersData.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No data found in the uploaded file'
        });
      }

      // Bulk upload cylinders
      const result = await cylinderService.bulkUploadCylinders(
        cylindersData,
        company_id,
        branch_id,
        created_by
      );

      // Return results
      res.status(200).json({
        status: 'success',
        message: `Upload complete. ${result.inserted} cylinder(s) inserted successfully, ${result.failed} failed.`,
        data: {
          total: result.total,
          inserted: result.inserted,
          failed: result.failed,
          errors: result.errors.slice(0, 10), // Return first 10 errors
          insertedRecords: result.insertedRecords
        }
      });

    } catch (error) {
      console.error('Upload cylinders error:', error);
      
      // Clean up file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to upload cylinders'
      });
    }
  }
}

module.exports = new CylinderController();

