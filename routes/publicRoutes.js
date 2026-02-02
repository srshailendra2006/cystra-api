const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Public API endpoints (no authentication required)
 */

/**
 * @swagger
 * /api/v1/public/cylinder/{barcode}:
 *   get:
 *     summary: Get cylinder details by barcode (Public - No Auth Required)
 *     tags: [Public]
 *     description: |
 *       Public API to retrieve cylinder details by barcode number.
 *       This endpoint is designed to be used with QR codes.
 *       
 *       **QR Code URL Format:** `https://domain.com/#/cyl?info={barcode}`
 *       
 *       When scanned, the frontend page calls this API to fetch cylinder details.
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         description: The barcode number of the cylinder
 *         example: BC123456789
 *     responses:
 *       200:
 *         description: Cylinder details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     manufacture_details:
 *                       type: object
 *                     cylinder_details:
 *                       type: object
 *                     testing_details:
 *                       type: object
 *       404:
 *         description: Cylinder not found
 *       500:
 *         description: Server error
 */
router.get('/cylinder/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({
        status: 'error',
        message: 'Barcode is required'
      });
    }

    const pool = await getPool();

    // Get cylinder details by barcode
    const cylinderResult = await pool.request()
      .input('barcode', sql.NVarChar(100), barcode)
      .query(`
        SELECT 
          c.id,
          c.cylinder_code,
          c.serial_number,
          c.barcode_number,
          c.cylinder_type,
          c.capacity,
          c.capacity_unit,
          c.manufacturer,
          c.manufacture_date,
          c.last_test_date,
          c.next_test_date,
          c.status,
          c.is_active,
          c.created_at,
          comp.company_name,
          b.branch_name
        FROM cylinders c
        LEFT JOIN companies comp ON c.company_id = comp.id
        LEFT JOIN branches b ON c.branch_id = b.id
        WHERE c.barcode_number = @barcode AND c.is_active = 1
      `);

    if (!cylinderResult.recordset || cylinderResult.recordset.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Cylinder not found with this barcode'
      });
    }

    const cylinder = cylinderResult.recordset[0];

    // Get latest test record for this cylinder
    const testResult = await pool.request()
      .input('cylinder_id', sql.Int, cylinder.id)
      .query(`
        SELECT TOP 1
          ct.test_date,
          ct.test_type,
          ct.test_pressure,
          ct.test_result,
          ct.inspector_name,
          ct.notes,
          ct.next_test_date
        FROM cylinder_tests ct
        WHERE ct.cylinder_id = @cylinder_id
        ORDER BY ct.test_date DESC
      `);

    const latestTest = testResult.recordset[0] || null;

    // Format response matching the UI sections
    const response = {
      status: 'success',
      data: {
        // MANUFACTURE DETAILS section
        manufacture_details: {
          manufacture_date: cylinder.manufacture_date ? formatDate(cylinder.manufacture_date) : null,
          manufacturer_name: cylinder.manufacturer || null,
          manufacturer_number: cylinder.serial_number || null  // Using serial_number as manufacturer number
        },
        
        // CYLINDER DETAILS section
        cylinder_details: {
          qr_code: cylinder.barcode_number || null,
          cylinder_number: cylinder.cylinder_code || null,
          peso_number: cylinder.serial_number || null,  // Mapping serial_number to PESO
          category: cylinder.cylinder_type || null,
          ownership: cylinder.company_name || null,  // Company as ownership
          valve_type: null  // Not in current schema
        },
        
        // TESTING DETAILS section
        testing_details: {
          test_status: latestTest?.test_result || cylinder.status || null,
          last_test_date: cylinder.last_test_date ? formatDate(cylinder.last_test_date) : null,
          test_name: latestTest?.test_type || null,
          tare_weight: null,  // Not in current schema
          permission_date: null,  // Not in current schema
          working_pressure: latestTest?.test_pressure ? `${latestTest.test_pressure} bar` : null,
          water_filling_capacity: cylinder.capacity ? `${cylinder.capacity} ${cylinder.capacity_unit || 'Liters'}` : null,
          reference_number: null,  // Not in current schema
          rejection_date: null,  // Not in current schema
          next_test_date: cylinder.next_test_date ? formatDate(cylinder.next_test_date) : null,
          inspector_name: latestTest?.inspector_name || null,
          test_notes: latestTest?.notes || null
        },

        // Additional info
        meta: {
          cylinder_id: cylinder.id,
          barcode: cylinder.barcode_number,
          company: cylinder.company_name,
          branch: cylinder.branch_name,
          is_active: cylinder.is_active,
          registered_on: cylinder.created_at ? formatDate(cylinder.created_at) : null
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Public cylinder lookup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve cylinder details'
    });
  }
});

/**
 * Helper function to format date
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
}

module.exports = router;

