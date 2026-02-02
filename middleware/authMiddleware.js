const jwt = require('jsonwebtoken');

/**
 * Authentication middleware to verify JWT token and extract user info
 * Sets req.user with the decoded token payload (user_id, company_id, branch_id, email)
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided. Please login first.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Set user info in request object (including role and permissions)
    req.user = {
      user_id: decoded.user_id,
      company_id: decoded.company_id,
      branch_id: decoded.branch_id,
      email: decoded.email,
      role_id: decoded.role_id,
      role_name: decoded.role_name,
      permission_level: decoded.permission_level
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired. Please login again.'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token, but sets req.user if valid token exists
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      req.user = {
        user_id: decoded.user_id,
        company_id: decoded.company_id,
        branch_id: decoded.branch_id,
        email: decoded.email,
        role_id: decoded.role_id,
        role_name: decoded.role_name,
        permission_level: decoded.permission_level
      };
    }
    
    next();
  } catch (error) {
    // Token invalid but we continue without user info
    next();
  }
};

module.exports = { authenticate, optionalAuth };

