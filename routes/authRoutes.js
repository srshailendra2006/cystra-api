const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegistration:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         company_id:
 *           type: integer
 *           description: Company ID (Option 1 - use with branch_id)
 *           example: 1
 *         branch_id:
 *           type: integer
 *           description: Branch ID (Option 1 - use with company_id)
 *           example: 1
 *         company_name:
 *           type: string
 *           description: Company Name (Option 2 - use with branch_name)
 *           example: Cystra Industries
 *         branch_name:
 *           type: string
 *           description: Branch Name (Option 2 - use with company_name)
 *           example: Main Branch - NYC
 *         username:
 *           type: string
 *           description: Unique username
 *           example: johndoe
 *         email:
 *           type: string
 *           format: email
 *           description: Unique email address
 *           example: john.doe@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: Password (min 6 characters)
 *           example: password123
 *         first_name:
 *           type: string
 *           description: First name
 *           example: John
 *         last_name:
 *           type: string
 *           description: Last name
 *           example: Doe
 *         phone_number:
 *           type: string
 *           description: Phone number
 *           example: +1-234-567-8900
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
 *     User:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *         company_id:
 *           type: integer
 *         company_name:
 *           type: string
 *         branch_id:
 *           type: integer
 *         branch_name:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         phone_number:
 *           type: string
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user (Company-Branch System)
 *     tags: [Authentication]
 *     description: |
 *       Register a new user with company and branch assignment. No email verification required - user can login immediately after registration.
 *       
 *       **Two Ways to Register:**
 *       1. **Using IDs** (company_id + branch_id) - Frontend gets IDs from /api/v1/companies and /api/v1/companies/:id/branches
 *       2. **Using Names** (company_name + branch_name) - Frontend sends names directly, API looks up IDs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           examples:
 *             withIds:
 *               summary: Option 1 - Using Company ID & Branch ID
 *               value:
 *                 company_id: 1
 *                 branch_id: 1
 *                 username: johndoe
 *                 email: john.doe@example.com
 *                 password: password123
 *             withNames:
 *               summary: Option 2 - Using Company Name & Branch Name (YOUR APPROACH)
 *               value:
 *                 company_name: Cystra Industries
 *                 branch_name: Main Branch - NYC
 *                 username: johndoe
 *                 email: john.doe@example.com
 *                 password: password123
 *             withNamesFull:
 *               summary: Option 2 - With Full Details
 *               value:
 *                 company_name: Cystra Industries
 *                 branch_name: Main Branch - NYC
 *                 username: janedoe
 *                 email: jane.doe@example.com
 *                 password: securepass456
 *                 first_name: Jane
 *                 last_name: Doe
 *                 phone_number: +1-234-567-8900
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type: integer
 *                           example: 1
 *                         company_id:
 *                           type: integer
 *                           example: 1
 *                         branch_id:
 *                           type: integer
 *                           example: 1
 *                         username:
 *                           type: string
 *                           example: johndoe
 *                         email:
 *                           type: string
 *                           example: john.doe@example.com
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Bad request (validation error or user already exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: User with this email already exists
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     description: Login with email and password. Returns user details including company and branch information.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid credentials
 *       403:
 *         description: Account locked or inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Account is locked due to too many failed login attempts
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     description: Get the authenticated user's profile information including company and branch details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized (no token or invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: No token provided
 */
router.get('/me', authController.getCurrentUser);

module.exports = router;
