// ======================================================
// Auto Database Initialization (Optional)
// ======================================================
// This module can automatically initialize the database
// when the server starts if AUTO_DB_INIT=true in .env

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

async function autoInitializeDatabase(config, dbName) {
  let pool;
  
  try {
    console.log('🔄 Auto-initializing database...');
    
    // Connect to SQL Server
    pool = await sql.connect(config);
    
    // Check if database exists
    const dbCheck = await pool.request().query(
      `SELECT name FROM sys.databases WHERE name = '${dbName}'`
    );
    
    if (dbCheck.recordset.length > 0) {
      console.log('✅ Database already exists, skipping initialization');
      await pool.close();
      return true;
    }
    
    console.log('📝 Database does not exist, creating...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'db', 'company_branch_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.warn('⚠️  Schema file not found, skipping auto-initialization');
      await pool.close();
      return false;
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    const statements = schema.split(/\bGO\b/i).filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.request().query(statement);
        } catch (err) {
          // Ignore errors for existing objects
          if (!err.message.includes('already exists')) {
            console.warn(`   ⚠️  Warning: ${err.message}`);
          }
        }
      }
    }
    
    console.log('✅ Database auto-initialized successfully');
    await pool.close();
    return true;
    
  } catch (error) {
    console.error('❌ Auto-initialization failed:', error.message);
    if (pool) await pool.close();
    return false;
  }
}

module.exports = { autoInitializeDatabase };

