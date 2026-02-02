const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const cylinderController = require('../controllers/cylinderController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cylinders-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept CSV and Excel files
  const allowedTypes = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and Excel files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Cylinder:
 *       type: object
 *       required:
 *         - company_id
 *         - branch_id
 *         - cylinder_code
 *         - cylinder_family_code
 *         - owner_type
 *       properties:
 *         company_id:
 *           type: integer
 *           description: Company ID
 *           example: 1
 *         branch_id:
 *           type: integer
 *           description: Branch ID
 *           example: 1
 *         cylinder_code:
 *           type: string
 *           description: Unique cylinder code
 *           example: CYL-001
 *         serial_number:
 *           type: string
 *           nullable: true
 *           description: Serial number (optional)
 *           example: SN123456789
 *         barcode_number:
 *           type: string
 *           description: Barcode number for scanning
 *           example: BC123456789
 *         cylinder_type:
 *           type: string
 *           description: Type of cylinder
 *           example: Oxygen
 *         capacity:
 *           type: number
 *           format: decimal
 *           description: Cylinder capacity
 *           example: 50.00
 *         capacity_unit:
 *           type: string
 *           description: Unit of capacity
 *           example: Liters
 *         manufacturer:
 *           type: string
 *           description: Manufacturer name
 *           example: XYZ Corp
 *         manufacture_date:
 *           type: string
 *           format: date
 *           description: Manufacturing date
 *           example: 2023-01-15
 *         last_test_date:
 *           type: string
 *           format: date
 *           description: Last test date
 *           example: 2024-06-01
 *         next_test_date:
 *           type: string
 *           format: date
 *           description: Next test date
 *           example: 2025-06-01
 *         status:
 *           type: string
 *           description: Cylinder status
 *           enum: [available, in_use, testing, maintenance, retired]
 *           example: available
 *         owner_type:
 *           type: string
 *           description: Ownership type
 *           enum: [SELF, PARTY]
 *           example: SELF
 *         cylinder_family_code:
 *           type: string
 *           nullable: true
 *           description: Cylinder family/group code
 *           example: "FAM-01"
 *         gas_content:
 *           type: string
 *           nullable: true
 *           description: Gas content (for labeling/search)
 *           example: "CO2"
 *         manufacture_no:
 *           type: string
 *           nullable: true
 *           description: Manufacturer number / batch number
 *           example: "MFG-2025-001"
 *         challan_no:
 *           type: string
 *           nullable: true
 *           description: Challan number (optional)
 *           example: "CH-12345"
 *         owner_party_id:
 *           type: integer
 *           nullable: true
 *           description: PartyID (required when owner_type is PARTY)
 *           example: 101
 *         current_holder_party_id:
 *           type: integer
 *           nullable: true
 *           description: PartyID who currently holds the cylinder (optional)
 *           example: 102
 *         ownership_remarks:
 *           type: string
 *           nullable: true
 *           description: Ownership/holding remarks
 *           example: Assigned to customer for 30 days
 *         created_by:
 *           type: integer
 *           description: User ID who created the cylinder
 *           example: 1
 *         test_date:
 *           type: string
 *           format: date
 *           description: Test date (optional - creates test record if provided with test_type and test_result)
 *           example: 2024-06-01
 *         test_type:
 *           type: string
 *           description: Type of test (Hydrostatic, Visual, Leak, Pressure, Internal)
 *           enum: [Hydrostatic, Visual, Leak, Pressure, Internal]
 *           example: Hydrostatic
 *         test_pressure:
 *           type: number
 *           format: decimal
 *           description: Test pressure value (optional)
 *           example: 250.00
 *         test_result:
 *           type: string
 *           description: Test result (Pass, Fail, Conditional)
 *           enum: [Pass, Fail, Conditional]
 *           example: Pass
 *         inspector_name:
 *           type: string
 *           description: Name of inspector (optional)
 *           example: John Inspector
 *         test_notes:
 *           type: string
 *           description: Test notes (optional)
 *           example: All checks passed successfully
 *         tested_by:
 *           type: integer
 *           description: User ID who performed the test (optional)
 *           example: 1
 */

/**
 * @swagger
 * /api/v1/cylinders:
 *   post:
 *     summary: Create a new cylinder (with auto test record)
 *     tags: [Cylinders]
 *     description: Create a new cylinder with company and branch assignment. If test information is provided, a test record will be automatically created in cylinder_tests table.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cylinder'
 *           example:
 *             company_id: 1
 *             branch_id: 1
 *             cylinder_code: "CYL-001"
 *             serial_number: null
 *             barcode_number: "BC123456789"
 *             cylinder_type: "Oxygen"
 *             capacity: 50.00
 *             capacity_unit: "Liters"
 *             manufacturer: "XYZ Corp"
 *             manufacture_date: "2023-01-15"
 *             last_test_date: "2024-06-01"
 *             next_test_date: "2025-06-01"
 *             status: "available"
 *             owner_type: "SELF"
 *             cylinder_family_code: "FAM-01"
 *             gas_content: "Oxygen"
 *             manufacture_no: "MFG-2023-10"
 *             challan_no: "CH-1001"
 *             owner_party_id: null
 *             current_holder_party_id: null
 *             ownership_remarks: null
 *             created_by: 1
 *             test_date: "2024-06-01"
 *             test_type: "Hydrostatic"
 *             test_pressure: 250.00
 *             test_result: "Pass"
 *             inspector_name: "John Inspector"
 *             test_notes: "Initial inspection passed"
 *             tested_by: 1
 *     responses:
 *       201:
 *         description: Cylinder created successfully (with optional test record in cylinder_tests table)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cylinder and test record created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     cylinder_id:
 *                       type: integer
 *                       example: 1
 *                     test_id:
 *                       type: integer
 *                       nullable: true
 *                       example: 1
 *                     test_record_created:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Bad request (validation error or duplicate)
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, cylinderController.createCylinder);

/**
 * @swagger
 * /api/v1/cylinders/upload:
 *   post:
 *     summary: Bulk upload cylinders from CSV file
 *     tags: [Cylinders]
 *     description: Upload a CSV file to bulk insert cylinders. The file should contain headers matching the cylinder fields. Test data will automatically create records in cylinder_tests table.
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - company_id
 *               - branch_id
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing cylinder data
 *               company_id:
 *                 type: integer
 *                 description: Company ID
 *                 example: 1
 *               branch_id:
 *                 type: integer
 *                 description: Branch ID
 *                 example: 1
 *               created_by:
 *                 type: integer
 *                 description: User ID who is uploading
 *                 example: 1
 *     responses:
 *       200:
 *         description: Cylinders uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Upload complete. 10 cylinder(s) inserted successfully, 0 failed.
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 10
 *                     inserted:
 *                       type: integer
 *                       example: 10
 *                     failed:
 *                       type: integer
 *                       example: 0
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                     insertedRecords:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Bad request (no file, invalid file type, or missing parameters)
 *       500:
 *         description: Server error
 */
router.post('/upload', authenticate, upload.single('file'), cylinderController.uploadCylinders);

/**
 * @swagger
 * /api/v1/cylinders:
 *   get:
 *     summary: Get all cylinders with pagination and filters
 *     tags: [Cylinders]
 *     description: Retrieve cylinders for a specific company and branch with optional filtering
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *         example: 1
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (code, serial, type, manufacturer)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of cylinders
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/', cylinderController.getCylinders);

/**
 * @swagger
 * /api/v1/cylinders/stats:
 *   get:
 *     summary: Get cylinder statistics by status
 *     tags: [Cylinders]
 *     description: Get count of cylinders grouped by status for dashboard
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Cylinder statistics
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/stats', cylinderController.getCylinderStats);

/**
 * @swagger
 * /api/v1/cylinders/due-for-test:
 *   get:
 *     summary: Get cylinders due for testing
 *     tags: [Cylinders]
 *     description: Get list of cylinders that need testing within specified days
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days ahead to check
 *     responses:
 *       200:
 *         description: List of cylinders due for test
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.get('/due-for-test', cylinderController.getCylindersDueForTest);

/**
 * @swagger
 * /api/v1/cylinders/code/{code}:
 *   get:
 *     summary: Get cylinder by code
 *     tags: [Cylinders]
 *     description: Retrieve a specific cylinder by its code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Cylinder code
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Cylinder details
 *       404:
 *         description: Cylinder not found
 *       500:
 *         description: Server error
 */
router.get('/code/:code', cylinderController.getCylinderByCode);

/**
 * @swagger
 * /api/v1/cylinders/serial/{serial}:
 *   get:
 *     summary: Get cylinder by serial number
 *     tags: [Cylinders]
 *     description: Retrieve a specific cylinder by its serial number
 *     parameters:
 *       - in: path
 *         name: serial
 *         required: true
 *         schema:
 *           type: string
 *         description: Serial number
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Cylinder details
 *       404:
 *         description: Cylinder not found
 *       500:
 *         description: Server error
 */
router.get('/serial/:serial', cylinderController.getCylinderBySerialNumber);

/**
 * @swagger
 * /api/v1/cylinders/{cylinderId}/tests:
 *   get:
 *     summary: Get testing history for a cylinder
 *     tags: [Cylinders]
 *     description: Returns the test history for a selected cylinder (for modal table).
 *     parameters:
 *       - in: path
 *         name: cylinderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cylinder ID
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Branch ID (optional)
 *       - in: query
 *         name: test_type
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by test type (optional)
 *     responses:
 *       200:
 *         description: Test history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       test_id:
 *                         type: integer
 *                         example: 101
 *                       test_status:
 *                         type: string
 *                         example: Pass
 *                       test_date:
 *                         type: string
 *                         format: date
 *                         example: 2025-01-16
 *                       tester_name:
 *                         type: string
 *                         example: SGL
 *                       tare_weight:
 *                         type: number
 *                         format: decimal
 *                         nullable: true
 *                         example: 45.1
 *                       reference_number:
 *                         type: string
 *                         nullable: true
 *                         example: REF-123
 *                       permission_number:
 *                         type: string
 *                         nullable: true
 *                         example: PERM-001
 *                       permission_date:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                         example: 2025-01-01
 *                       water_filling_capacity:
 *                         type: number
 *                         format: decimal
 *                         nullable: true
 *                         example: 10.5
 *                       remarks:
 *                         type: string
 *                         nullable: true
 *                         example: All good
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       test_type:
 *                         type: string
 *                         nullable: true
 *                       test_pressure:
 *                         type: number
 *                         format: decimal
 *                         nullable: true
 *                       next_test_date:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 *
 *   post:
 *     summary: Add a new testing record for a cylinder
 *     tags: [Cylinders]
 *     security:
 *       - bearerAuth: []
 *     description: Creates a test record for a cylinder (Save button in test form).
 *     parameters:
 *       - in: path
 *         name: cylinderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cylinder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *               - branch_id
 *               - test_status
 *               - test_date
 *             properties:
 *               company_id:
 *                 type: integer
 *                 example: 2
 *               branch_id:
 *                 type: integer
 *                 example: 1
 *               test_status:
 *                 type: string
 *                 description: Status/result (FINE/OK/PASS/FAIL etc). Normalized server-side.
 *                 example: FINE
 *               test_date:
 *                 type: string
 *                 format: date
 *                 example: 2025-01-16
 *               tester_name:
 *                 type: string
 *                 example: SGL
 *               test_type:
 *                 type: string
 *                 example: Hydrostatic
 *               test_pressure:
 *                 type: number
 *                 format: decimal
 *                 nullable: true
 *                 example: 250.0
 *               next_test_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: 2026-01-16
 *               tare_weight:
 *                 type: number
 *                 format: decimal
 *                 nullable: true
 *                 example: 45.1
 *               reference_number:
 *                 type: string
 *                 nullable: true
 *                 example: REF-123
 *               permission_number:
 *                 type: string
 *                 nullable: true
 *                 example: PERM-001
 *               permission_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: 2025-01-01
 *               water_filling_capacity:
 *                 type: number
 *                 format: decimal
 *                 nullable: true
 *                 example: 10.5
 *               remarks:
 *                 type: string
 *                 nullable: true
 *                 example: Test completed successfully
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: Extra notes
 *     responses:
 *       201:
 *         description: Test record created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:cylinderId/tests', cylinderController.getCylinderTests);
router.post('/:cylinderId/tests', authenticate, cylinderController.addCylinderTest);

/**
 * @swagger
 * /api/v1/cylinders/{id}:
 *   get:
 *     summary: Get cylinder by ID
 *     tags: [Cylinders]
 *     description: Retrieve a specific cylinder by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cylinder ID
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Cylinder details
 *       404:
 *         description: Cylinder not found
 *       500:
 *         description: Server error
 */
router.get('/:id', cylinderController.getCylinderById);

/**
 * @swagger
 * /api/v1/cylinders/{id}:
 *   put:
 *     summary: Update cylinder
 *     tags: [Cylinders]
 *     description: Update an existing cylinder (partial update supported)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cylinder ID
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cylinder_code:
 *                 type: string
 *               serial_number:
 *                 type: string
 *               cylinder_type:
 *                 type: string
 *               capacity:
 *                 type: number
 *               capacity_unit:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               manufacture_date:
 *                 type: string
 *                 format: date
 *               last_test_date:
 *                 type: string
 *                 format: date
 *               next_test_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *               owner_type:
 *                 type: string
 *                 enum: [SELF, PARTY]
 *               cylinder_family_code:
 *                 type: string
 *                 nullable: true
 *               gas_content:
 *                 type: string
 *                 nullable: true
 *               manufacture_no:
 *                 type: string
 *                 nullable: true
 *               challan_no:
 *                 type: string
 *                 nullable: true
 *               owner_party_id:
 *                 type: integer
 *                 nullable: true
 *               current_holder_party_id:
 *                 type: integer
 *                 nullable: true
 *               ownership_remarks:
 *                 type: string
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *           example:
 *             status: "in_use"
 *             owner_type: "PARTY"
 *             cylinder_family_code: "FAM-02"
 *             gas_content: "CO2"
 *             manufacture_no: "MFG-2022-11"
 *             challan_no: "CH-2002"
 *             owner_party_id: 101
 *             current_holder_party_id: 101
 *             ownership_remarks: "Given on rental"
 *             last_test_date: "2024-11-20"
 *             next_test_date: "2025-11-20"
 *     responses:
 *       200:
 *         description: Cylinder updated successfully
 *       404:
 *         description: Cylinder not found
 *       500:
 *         description: Server error
 */
router.put('/:id', cylinderController.updateCylinder);

/**
 * @swagger
 * /api/v1/cylinders/{id}:
 *   delete:
 *     summary: Delete cylinder
 *     tags: [Cylinders]
 *     description: Soft delete a cylinder (sets is_active to false)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cylinder ID
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Cylinder deleted successfully
 *       404:
 *         description: Cylinder not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', cylinderController.deleteCylinder);

module.exports = router;

