// ======================================================
// 🗄️ Database Initialization Script (SQL Server)
// ======================================================
// Run this script to automatically create the database and tables
// Usage: node dbInit.js

require("dotenv").config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Database configuration WITHOUT database name (to create it)
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const DB_NAME = process.env.DB_NAME || 'cystra_db';

async function initializeDatabase() {
  let pool;
  
  try {
    console.log('\n🔄 Starting database initialization...\n');
    
    // Step 1: Connect to SQL Server
    console.log('📡 Connecting to SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server\n');
    
    // Step 2: Check if database exists
    console.log(`🔍 Checking if database '${DB_NAME}' exists...`);
    const dbCheck = await pool.request().query(
      `SELECT name FROM sys.databases WHERE name = '${DB_NAME}'`
    );
    
    if (dbCheck.recordset.length > 0) {
      console.log(`✅ Database '${DB_NAME}' already exists`);
    } else {
      console.log(`📝 Database '${DB_NAME}' does not exist, creating...\n`);
    }
    
    // Step 3: Read schema file
    console.log('📖 Reading schema file...');
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    let schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded\n');
    
    // Step 4: Execute schema (split by GO statements)
    console.log('🔨 Executing schema...');
    const statements = schema.split(/\bGO\b/i).filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.request().query(statement);
      }
    }
    console.log('✅ Schema executed successfully\n');
    
    // Step 5: Verify tables
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM ${DB_NAME}.INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 Created tables:');
    if (tables.recordset.length > 0) {
      tables.recordset.forEach((table) => {
        console.log(`   ✓ ${table.TABLE_NAME}`);
      });
    } else {
      console.log('   (No tables found - may need to check schema)');
    }
    
    console.log('\n✅ Database initialization completed successfully!\n');
    console.log('🎉 You can now start your API server:\n');
    console.log('   npm start\n');
    console.log('   or\n');
    console.log('   npm run dev\n');
    
  } catch (error) {
    console.error('❌ Database initialization failed:\n');
    console.error(`   Error: ${error.message}\n`);
    
    // Helpful error messages
    if (error.code === 'ECONNREFUSED' || error.code === 'ESOCKET') {
      console.error('💡 Troubleshooting:');
      console.error('   - Make sure SQL Server is running');
      console.error('   - Check DB_HOST and DB_PORT in .env file');
      console.error('   - Verify SQL Server is configured for TCP/IP connections\n');
    } else if (error.code === 'ELOGIN') {
      console.error('💡 Troubleshooting:');
      console.error('   - Check DB_USER and DB_PASSWORD in .env file');
      console.error('   - Make sure SQL Server authentication is enabled');
      console.error('   - Verify the user has CREATE DATABASE privileges\n');
    } else {
      console.error('💡 Check the error message above for details\n');
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run the initialization
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║                                                      ║');
console.log('║     🗄️  Cystra API Database Initialization         ║');
console.log('║                  (SQL Server)                        ║');
console.log('║                                                      ║');
console.log('╚══════════════════════════════════════════════════════╝');

initializeDatabase();
