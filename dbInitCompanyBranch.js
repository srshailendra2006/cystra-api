// ======================================================
// 🗄️ Database Initialization Script - Company-Branch System
// ======================================================
// This script automatically creates tables and stored procedures
// Usage: node dbInitCompanyBranch.js

require("dotenv").config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Database configuration WITHOUT database name (to create it)
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || '',
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
    console.log('\n🔄 Starting Company-Branch System initialization...\n');
    
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
      console.log(`📝 Database '${DB_NAME}' does not exist, will be created by schema\n`);
    }
    
    // Step 3: Read schema file
    console.log('📖 Reading company-branch schema file...');
    const schemaPath = path.join(__dirname, 'db', 'company_branch_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    let schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded\n');
    
    // Step 4: Execute schema (split by GO statements)
    console.log('🔨 Executing schema...');
    console.log('   This will create:');
    console.log('   - 6 Tables (companies, branches, users, cylinders, cylinder_tests, user_activity_log)');
    console.log('   - 12 Stored Procedures');
    console.log('   - Sample data (2 companies, 3 branches)\n');
    
    const statements = schema.split(/\bGO\b/i).filter(s => s.trim());
    let completedStatements = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.request().query(statement);
          completedStatements++;
          // Show progress every 5 statements
          if (completedStatements % 5 === 0) {
            console.log(`   ✓ Processed ${completedStatements}/${statements.length} statements...`);
          }
        } catch (err) {
          // Some statements might fail if objects already exist - that's okay
          if (!err.message.includes('already exists') && !err.message.includes('There is already')) {
            console.warn(`   ⚠️  Warning: ${err.message}`);
          }
        }
      }
    }
    console.log(`   ✓ Processed ${completedStatements}/${statements.length} statements`);
    console.log('✅ Schema executed successfully\n');
    
    // Step 5: Verify tables
    console.log('📊 Verifying tables...');
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM ${DB_NAME}.INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    if (tables.recordset.length > 0) {
      console.log('✅ Tables created:');
      tables.recordset.forEach((table) => {
        console.log(`   ✓ ${table.TABLE_NAME}`);
      });
    } else {
      console.log('   ⚠️  No tables found - check if schema executed correctly');
    }
    
    // Step 6: Verify stored procedures
    console.log('\n📊 Verifying stored procedures...');
    const procedures = await pool.request().query(`
      SELECT ROUTINE_NAME 
      FROM ${DB_NAME}.INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `);
    
    if (procedures.recordset.length > 0) {
      console.log('✅ Stored Procedures created:');
      procedures.recordset.forEach((proc) => {
        console.log(`   ✓ ${proc.ROUTINE_NAME}`);
      });
    }
    
    // Step 7: Verify sample data
    console.log('\n📊 Checking sample data...');
    try {
      const companies = await pool.request().query(`SELECT COUNT(*) as count FROM ${DB_NAME}.dbo.companies`);
      const branches = await pool.request().query(`SELECT COUNT(*) as count FROM ${DB_NAME}.dbo.branches`);
      
      console.log(`✅ Sample data:
   ✓ Companies: ${companies.recordset[0].count}
   ✓ Branches: ${branches.recordset[0].count}`);
    } catch (err) {
      console.log('   ⚠️  Could not verify sample data');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database initialization completed successfully!');
    console.log('='.repeat(60));
    console.log('\n🎉 Company-Branch System is ready to use!\n');
    console.log('📝 What you can do now:');
    console.log('   1. Start your API server: npm start');
    console.log('   2. Test in Swagger: http://localhost:8081/api-docs');
    console.log('   3. Register users with company and branch');
    console.log('   4. Manage cylinders and tests\n');
    console.log('📖 Documentation:');
    console.log('   - docs/COMPANY_BRANCH_SYSTEM_GUIDE.md\n');
    
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
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║   🗄️  Company-Branch System - Database Initialization  ║');
console.log('║                     (SQL Server)                         ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝');

initializeDatabase();

