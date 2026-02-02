const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const companyRoutes = require('../routes/companyRoutes');
const roleRoutes = require('../routes/roleRoutes');
const branchRoutes = require('../routes/branchRoutes');
const cylinderRoutes = require('../routes/cylinderRoutes');
const cylinderTestRoutes = require('../routes/cylinderTestRoutes');
const searchRoutes = require('../routes/searchRoutes');
const partyRoutes = require('../routes/partyRoutes');
const partyTypeRoutes = require('../routes/partyTypeRoutes');
const partyCategoryRoutes = require('../routes/partyCategoryRoutes');
const partyAddressRoutes = require('../routes/partyAddressRoutes');
const countryRoutes = require('../routes/countryRoutes');
const stateRoutes = require('../routes/stateRoutes');
const cityRoutes = require('../routes/cityRoutes');
const gasTypeRoutes = require('../routes/gasTypeRoutes');
const gasCategoryRoutes = require('../routes/gasCategoryRoutes');
const unitOfMeasureRoutes = require('../routes/unitOfMeasureRoutes');
const cylinderFamilyRoutes = require('../routes/cylinderFamilyRoutes');
const gasTypeCylinderFamilyMapRoutes = require('../routes/gasTypeCylinderFamilyMapRoutes');
const partyGasRateRoutes = require('../routes/partyGasRateRoutes');
const preferenceRoutes = require('../routes/preferenceRoutes');
const userPreferenceRoutes = require('../routes/userPreferenceRoutes');
const rolePreferenceRoutes = require('../routes/rolePreferenceRoutes');
const publicRoutes = require('../routes/publicRoutes');

// API version 1
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/roles', roleRoutes);
router.use('/v1/companies', companyRoutes);
router.use('/v1/branches', branchRoutes);
router.use('/v1/cylinders', cylinderRoutes);
router.use('/v1/cylinder-tests', cylinderTestRoutes);
router.use('/v1/search', searchRoutes);
router.use('/v1/parties', partyRoutes);
router.use('/v1/party-types', partyTypeRoutes);
router.use('/v1/party-categories', partyCategoryRoutes);
router.use('/v1/party-addresses', partyAddressRoutes);
router.use('/v1/countries', countryRoutes);
router.use('/v1/states', stateRoutes);
router.use('/v1/cities', cityRoutes);
router.use('/v1/gas-types', gasTypeRoutes);
router.use('/v1/gas-categories', gasCategoryRoutes);
router.use('/v1/unit-of-measures', unitOfMeasureRoutes);
router.use('/v1/cylinder-families', cylinderFamilyRoutes);
router.use('/v1/gas-type-cylinder-family-maps', gasTypeCylinderFamilyMapRoutes);
router.use('/v1/party-gas-rates', partyGasRateRoutes);
router.use('/v1/preferences', preferenceRoutes);
router.use('/v1/user-preferences', userPreferenceRoutes);
router.use('/v1/role-preferences', rolePreferenceRoutes);

// Public API (No Authentication Required)
router.use('/v1/public', publicRoutes);

// API root
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Cystra API - Company-Branch System',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      companies: '/api/v1/companies',
      cylinders: '/api/v1/cylinders',
      public: '/api/v1/public (No Auth Required)'
    }
  });
});

module.exports = router;

