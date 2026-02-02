const cylinderRepository = require('../repositories/cylinderRepository');

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

class CylinderTestController {
  /**
   * PUT /api/v1/cylinder-tests/:testId
   */
  async updateTest(req, res) {
    try {
      const { testId } = req.params;

      const company_id = parseInt(req.body.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.body.branch_id) || req.user?.branch_id;

      if (!company_id || !branch_id) {
        return res.status(400).json({ status: 'error', message: 'company_id and branch_id are required' });
      }

      if (!req.body.test_date) {
        return res.status(400).json({ status: 'error', message: 'test_date is required' });
      }

      const test_result = normalizeTestResult(req.body.test_status || req.body.test_result);
      if (!test_result) {
        return res.status(400).json({ status: 'error', message: 'test_status (or test_result) is required' });
      }

      const payload = {
        test_id: parseInt(testId),
        company_id,
        branch_id,
        test_date: req.body.test_date,
        test_type: req.body.test_type || 'Hydrostatic',
        test_pressure: req.body.test_pressure ?? null,
        test_result,
        inspector_name: req.body.tester_name || req.body.inspector_name || null,
        notes: req.body.notes ?? req.body.test_notes ?? null,
        next_test_date: req.body.next_test_date || null,
        tested_by: req.user?.user_id || req.body.tested_by || null,
        tare_weight: req.body.tare_weight ?? null,
        reference_number: req.body.reference_number || null,
        permission_number: req.body.permission_number || null,
        permission_date: req.body.permission_date || null,
        water_filling_capacity: req.body.water_filling_capacity ?? null,
        remarks: req.body.remarks || null
      };

      const result = await cylinderRepository.updateCylinderTest(payload);

      return res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Update cylinder test error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to update cylinder test'
      });
    }
  }

  /**
   * DELETE /api/v1/cylinder-tests/:testId?company_id=...&branch_id=...
   */
  async deleteTest(req, res) {
    try {
      const { testId } = req.params;

      const company_id = parseInt(req.query.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.query.branch_id) || req.user?.branch_id;

      if (!company_id || !branch_id) {
        return res.status(400).json({ status: 'error', message: 'company_id and branch_id are required' });
      }

      const result = await cylinderRepository.deleteCylinderTest({
        test_id: parseInt(testId),
        company_id,
        branch_id
      });

      return res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      console.error('Delete cylinder test error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to delete cylinder test'
      });
    }
  }
}

module.exports = new CylinderTestController();
