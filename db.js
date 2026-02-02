const sql = require('mssql');
require('dotenv').config();

// SQL Server configuration
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || '',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'cystra_db',
  options: {
    encrypt: false, // Set to true if using Azure
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Connection pool
let pool;

// Get or create pool
const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
};

// Test connection
const testConnection = async () => {
  try {
    const pool = await getPool();
    console.log('Database pool created');
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
};

// Execute query helper
const executeQuery = async (query, params = []) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add parameters if provided
    if (params && params.length > 0) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
    }
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('Query execution error:', error.message);
    throw error;
  }
};

// Execute with named parameters (for better SQL Server compatibility)
const executeQueryWithParams = async (query, paramsObj = {}) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add named parameters
    Object.keys(paramsObj).forEach(key => {
      request.input(key, paramsObj[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('Query execution error:', error.message);
    throw error;
  }
};

module.exports = {
  sql,
  getPool,
  executeQuery,
  executeQueryWithParams,
  testConnection
};

