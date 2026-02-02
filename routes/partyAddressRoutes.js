const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const partyAddressController = require('../controllers/partyAddressController');

/**
 * @swagger
 * /api/v1/party-addresses/{addressId}:
 *   put:
 *     summary: Update a party address by addressId
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, branch_id]
 *             properties:
 *               company_id: { type: integer }
 *               branch_id: { type: integer }
 *               address:
 *                 type: object
 *                 description: Only provided fields are updated
 *                 properties:
 *                   address_type: { type: string, nullable: true }
 *                   address1: { type: string, nullable: true }
 *                   address2: { type: string, nullable: true }
 *                   address3: { type: string, nullable: true }
 *                   city_id: { type: integer, nullable: true }
 *                   state_id: { type: integer, nullable: true }
 *                   country_id: { type: integer, nullable: true }
 *                   pincode: { type: string, nullable: true }
 *                   is_default: { type: boolean, nullable: true }
 *     responses:
 *       200:
 *         description: Address updated
 */
router.put('/:addressId', authenticate, partyAddressController.updateById.bind(partyAddressController));

/**
 * @swagger
 * /api/v1/party-addresses/{addressId}:
 *   delete:
 *     summary: Soft delete a party address by addressId
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Address deleted
 */
router.delete('/:addressId', authenticate, partyAddressController.softDeleteById.bind(partyAddressController));

module.exports = router;


