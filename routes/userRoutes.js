const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user (Admin/Manager function)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new user in the system. This endpoint is used from the dashboard
 *       when clicking "Add User". Requires authentication.
 *       
 *       **Note:** The `created_by` field is automatically set from the JWT token
 *       (logged-in user's ID).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *               - branch_id
 *               - username
 *               - email
 *               - password
 *               - first_name
 *               - role_id
 *             properties:
 *               company_id:
 *                 type: integer
 *                 description: Company ID
 *                 example: 1
 *               branch_id:
 *                 type: integer
 *                 description: Branch ID
 *                 example: 2
 *               username:
 *                 type: string
 *                 description: Unique username
 *                 example: new_operator
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: operator@cystra.com
 *               password:
 *                 type: string
 *                 description: User password (min 6 characters)
 *                 example: TempPass123
 *               first_name:
 *                 type: string
 *                 description: First name
 *                 example: New
 *               last_name:
 *                 type: string
 *                 description: Last name (optional)
 *                 example: Operator
 *               phone:
 *                 type: string
 *                 description: Phone number (optional)
 *                 example: "9876543210"
 *               role_id:
 *                 type: integer
 *                 description: Role ID for the user
 *                 example: 4
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                   example: User created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       example: 10
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Login required
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, userController.createUser);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', userController.getAllUsers);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
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
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Updated
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johnupdated@example.com
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   example: User updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', userController.updateUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *                   example: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;

