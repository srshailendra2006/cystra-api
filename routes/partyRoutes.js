const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const partyController = require('../controllers/partyController');
const partyAddressController = require('../controllers/partyAddressController');
const multer = require('multer');
const path = require('path');

// Configure multer for party CSV uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'parties-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.csv') cb(null, true);
  else cb(new Error('Only CSV files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * @swagger
 * tags:
 *   name: Parties
 *   description: Party master endpoints
 */

/**
 * @swagger
 * /api/v1/parties:
 *   get:
 *     summary: List parties (Party master)
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by name/code/phone/email/contact person
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Parties list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       party_id: { type: integer }
 *                       company_id: { type: integer }
 *                       branch_id: { type: integer }
 *                       cust_name: { type: string }
 *                       cust_code: { type: string }
 *                       party_type_id: { type: integer, nullable: true }
 *                       party_category_id: { type: integer, nullable: true }
 *                       party_type: { type: string, nullable: true }
 *                       party_category: { type: string, nullable: true }
 *                       gst_num: { type: string, nullable: true }
 *                       pan_no: { type: string, nullable: true }
 *                       cin_no: { type: string, nullable: true }
 *                       company_type: { type: string, nullable: true }
 *                       msme_no: { type: string, nullable: true }
 *                       msme_type: { type: string, nullable: true }
 *                       udyam_no: { type: string, nullable: true }
 *                       is_active: { type: boolean }
 *                       party_phone: { type: string, nullable: true }
 *                       party_email: { type: string, nullable: true }
 *                       contact_person: { type: string, nullable: true }
 *                       created_on: { type: string, nullable: true }
 *                       modified_on: { type: string, nullable: true }
 *                       created_by: { type: string, nullable: true }
 *                       modified_by: { type: string, nullable: true }
 *                       primary_phone: { type: string, nullable: true }
 *                       primary_email: { type: string, nullable: true }
 */
router.get('/', authenticate, partyController.getParties.bind(partyController));

/**
 * @swagger
 * /api/v1/parties/upload:
 *   post:
 *     summary: Bulk upload Parties (PartyMaster + optional Address + optional Contact) from CSV
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Industry-standard UPSERT:
 *       - Match party by (company_id, branch_id, party_code/cust_code).
 *       - If exists: UPDATE only fields provided (blank cells do NOT overwrite existing values).
 *       - If not exists: INSERT new party.
 *
 *       Addresses/Contacts (if provided in row):
 *       - Address upsert natural key: (party_id + address_type + address1 + pincode)
 *       - Contact upsert natural key: email else mobile_no else phone_no else (first_name+last_name)
 *
 *       Notes:
 *       - company_id and branch_id should be present in CSV rows (token scoping is enforced).
 *       - If is_default=1, old defaults for that party+address_type are cleared.
 *       - If is_primary=1, old primaries for that party are cleared.
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload summary (partial success supported)
 *       400:
 *         description: Bad request (no file / invalid CSV)
 */
router.post('/upload', authenticate, upload.single('file'), partyController.uploadParties.bind(partyController));

/**
 * @swagger
 * /api/v1/parties/{partyId}/addresses:
 *   get:
 *     summary: List addresses for a party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partyId
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
 *         description: Party addresses
 */
router.get('/:partyId/addresses', authenticate, partyAddressController.listByParty.bind(partyAddressController));

/**
 * @swagger
 * /api/v1/parties/{partyId}/addresses:
 *   post:
 *     summary: Create address for a party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partyId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, branch_id, address]
 *             properties:
 *               company_id: { type: integer }
 *               branch_id: { type: integer }
 *               address:
 *                 type: object
 *                 required: [address_type, address1]
 *                 properties:
 *                   address_type: { type: string, example: Billing }
 *                   address1: { type: string }
 *                   address2: { type: string, nullable: true }
 *                   address3: { type: string, nullable: true }
 *                   city_id: { type: integer, nullable: true }
 *                   state_id: { type: integer, nullable: true }
 *                   country_id: { type: integer, nullable: true }
 *                   pincode: { type: string, nullable: true }
 *                   is_default: { type: boolean, nullable: true }
 *     responses:
 *       201:
 *         description: Address created
 */
router.post('/:partyId/addresses', authenticate, partyAddressController.createForParty.bind(partyAddressController));

/**
 * @swagger
 * /api/v1/parties/{id}:
 *   get:
 *     summary: Get party details (master + addresses + contacts)
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Party details
 */
router.get('/:id', authenticate, partyController.getPartyDetails.bind(partyController));

/**
 * @swagger
 * /api/v1/parties:
 *   post:
 *     summary: Create a party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, branch_id, party]
 *             properties:
 *               company_id: { type: integer }
 *               branch_id: { type: integer }
 *               party:
 *                 type: object
 *                 description: |
 *                   You may send either cust_code/cust_name OR party_code/party_name (aliases supported).
 *                 required: [party_code, party_name]
 *                 properties:
 *                   party_code: { type: string, description: Alias for cust_code }
 *                   party_name: { type: string, description: Alias for cust_name }
 *                   cust_code: { type: string, nullable: true }
 *                   cust_name: { type: string, nullable: true }
 *                   party_type_id: { type: integer, nullable: true }
 *                   party_category_id: { type: integer, nullable: true }
 *                   gst_num: { type: string, nullable: true }
 *                   pan_no: { type: string, nullable: true }
 *                   cin_no: { type: string, nullable: true }
 *                   party_phone: { type: string, nullable: true }
 *                   party_email: { type: string, nullable: true }
 *                   contact_person: { type: string, nullable: true }
 *                   company_type: { type: string, nullable: true }
 *                   msme_no: { type: string, nullable: true }
 *                   msme_type: { type: string, nullable: true }
 *                   udyam_no: { type: string, nullable: true }
 *               addresses:
 *                 type: array
 *                 items: { type: object }
 *               contacts:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       201:
 *         description: Party created
 */
router.post('/', authenticate, partyController.createParty.bind(partyController));

/**
 * @swagger
 * /api/v1/parties/{id}:
 *   put:
 *     summary: Update a party
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *               party:
 *                 type: object
 *                 description: Party master fields to update (only provided fields are applied)
 *                 properties:
 *                   cust_code: { type: string, nullable: true }
 *                   cust_name: { type: string, nullable: true }
 *                   party_type_id: { type: integer, nullable: true }
 *                   party_category_id: { type: integer, nullable: true }
 *                   gst_num: { type: string, nullable: true }
 *                   pan_no: { type: string, nullable: true }
 *                   cin_no: { type: string, nullable: true }
 *                   party_phone: { type: string, nullable: true }
 *                   party_email: { type: string, nullable: true }
 *                   contact_person: { type: string, nullable: true }
 *                   company_type: { type: string, nullable: true }
 *                   msme_no: { type: string, nullable: true }
 *                   msme_type: { type: string, nullable: true }
 *                   udyam_no: { type: string, nullable: true }
 *                   is_active: { type: boolean, nullable: true }
 *               addresses:
 *                 type: array
 *                 description: Upsert by address_id (if provided)
 *                 items: { type: object }
 *               contacts:
 *                 type: array
 *                 description: Upsert by contact_id (if provided)
 *                 items: { type: object }
 *     responses:
 *       200:
 *         description: Party updated
 */
router.put('/:id', authenticate, partyController.updateParty.bind(partyController));

/**
 * @swagger
 * /api/v1/parties/{id}:
 *   delete:
 *     summary: Delete a party (soft delete)
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Party deleted
 */
router.delete('/:id', authenticate, partyController.deleteParty.bind(partyController));

module.exports = router;


