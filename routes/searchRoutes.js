const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     summary: Global search (grouped results)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: KG711
 *       - in: query
 *         name: company_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Company ID (defaults to token company_id)
 *       - in: query
 *         name: branch_id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Branch ID (optional; may be enforced by RBAC)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Max items per section (1-50)
 *     responses:
 *       200:
 *         description: Grouped search results
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, searchController.search);

module.exports = router;
