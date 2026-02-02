const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const cylinderTestController = require('../controllers/cylinderTestController');

/**
 * @swagger
 * /api/v1/cylinder-tests/{testId}:
 *   put:
 *     summary: Update a cylinder test record
 *     tags: [Cylinders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Test ID
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
 *                 example: Updated remarks
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: Extra notes
 *     responses:
 *       200:
 *         description: Updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a cylinder test record
 *     tags: [Cylinders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Test ID
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
 *         description: Deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.put('/:testId', authenticate, cylinderTestController.updateTest);
router.delete('/:testId', authenticate, cylinderTestController.deleteTest);

module.exports = router;
