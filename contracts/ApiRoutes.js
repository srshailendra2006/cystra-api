const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');

// API version 1
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);

// API root
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Cystra API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users'
    }
  });
});

module.exports = router;

