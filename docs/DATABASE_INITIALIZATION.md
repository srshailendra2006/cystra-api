# 🗄️ Database Initialization Guide

## Overview

You have **multiple ways** to create the database tables and stored procedures for your Cystra API. Choose the method that works best for you!

---

## ⚡ Quick Answer

**Yes! The database can be automatically created when running the API!**

---

## 🚀 Method 1: Automatic Initialization (Recommended - Easiest!)

### Using NPM Script (Best Option)

Simply run this command **before starting your API**:

```bash
cd "Cystra API Code"
npm run db:init
```

**What it does:**
- ✅ Connects to SQL Server
- ✅ Creates `cystra_db` database if it doesn't exist
- ✅ Creates all 6 tables
- ✅ Creates all 12 stored procedures
- ✅ Inserts sample data (2 companies, 3 branches)
- ✅ Verifies everything was created correctly

**Output you'll see:**
```
╔══════════════════════════════════════════════════════════╗
║   🗄️  Company-Branch System - Database Initialization  ║
╚══════════════════════════════════════════════════════════╝

🔄 Starting Company-Branch System initialization...
📡 Connecting to SQL Server...
✅ Connected to SQL Server
🔍 Checking if database 'cystra_db' exists...
📝 Database does not exist, will be created by schema
📖 Reading company-branch schema file...
✅ Schema file loaded
🔨 Executing schema...
✅ Schema executed successfully
📊 Verifying tables...
✅ Tables created:
   ✓ branches
   ✓ companies
   ✓ cylinder_tests
   ✓ cylinders
   ✓ user_activity_log
   ✓ users
✅ Stored Procedures created:
   ✓ sp_CreateBranch
   ✓ sp_CreateCompany
   ✓ sp_CreateCylinder
   ✓ sp_CreateCylinderTest
   ...and more
✅ Sample data:
   ✓ Companies: 2
   ✓ Branches: 3

🎉 Company-Branch System is ready to use!
```

---

## 🎯 Method 2: First-Time Setup Flow

### Complete workflow for new setup:

```bash
# Step 1: Install dependencies (first time only)
npm install

# Step 2: Configure database connection (edit .env file)
# Make sure these are set:
#   DB_HOST=localhost
#   DB_PORT=1433
#   DB_USER=sa
#   DB_PASSWORD=Vaishnoma@2
#   DB_NAME=cystra_db

# Step 3: Initialize database
npm run db:init

# Step 4: Start your API
npm start
# or for development with auto-reload:
npm run dev
```

That's it! Your API will be running with a fully initialized database.

---

## 🖥️ Method 3: Using Azure Data Studio (Visual Method)

If you prefer a visual approach:

### Steps:

1. **Open Azure Data Studio**

2. **Connect to SQL Server:**
   - Server: `localhost`
   - Port: `1433`
   - User: `sa`
   - Password: `Vaishnoma@2`
   - Authentication: SQL Login

3. **Open the schema file:**
   - File → Open File
   - Navigate to: `Cystra API Code/db/company_branch_schema.sql`

4. **Execute the script:**
   - Press **F5** or click **Run**
   - Wait for completion (should take 5-10 seconds)

5. **Verify:**
   - You should see success messages
   - Check the database tree: you'll see `cystra_db` with all tables

6. **Start your API:**
   ```bash
   npm start
   ```

---

## 💻 Method 4: Using Command Line

For advanced users who prefer sqlcmd:

```bash
# Navigate to project directory
cd "/Users/shailendra/Desktop/Vaishnvi Technologies/CystraCode/Cystra API Code"

# Run the schema file
sqlcmd -S localhost -U sa -P Vaishnoma@2 -d master -i "db/company_branch_schema.sql"

# Or if database already exists:
sqlcmd -S localhost -U sa -P Vaishnoma@2 -d cystra_db -i "db/company_branch_schema.sql"
```

---

## 🔄 Method 5: Programmatic Initialization (Advanced)

If you want to initialize from Node.js code:

```javascript
const { autoInitializeDatabase } = require('./utils/dbAutoInit');

const config = {
  user: 'sa',
  password: 'Vaishnoma@2',
  server: 'localhost',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

await autoInitializeDatabase(config, 'cystra_db');
```

---

## 🔁 Re-running Initialization

### Is it safe to run multiple times?

**Yes!** The initialization script is **idempotent**, meaning:
- ✅ It won't fail if tables already exist
- ✅ It won't duplicate data
- ✅ It will update stored procedures if they changed
- ✅ Safe to run after code updates

### When to re-run:

1. **After pulling new code** - If schema changed
2. **After database corruption** - To recreate everything
3. **For testing** - To reset to clean state

### To completely reset:

```bash
# Drop the database (WARNING: Deletes all data!)
sqlcmd -S localhost -U sa -P Vaishnoma@2 -Q "DROP DATABASE IF EXISTS cystra_db"

# Re-initialize
npm run db:init
```

---

## 📊 What Gets Created

### Tables (6):
1. **companies** - Company master data
2. **branches** - Branch master data
3. **users** - User accounts (with company_id, branch_id)
4. **cylinders** - Cylinder inventory (with company_id, branch_id)
5. **cylinder_tests** - Test records (with company_id, branch_id)
6. **user_activity_log** - Audit trail (with company_id, branch_id)

### Stored Procedures (12):
1. `sp_RegisterUser` - Register new user
2. `sp_UserLogin` - User login
3. `sp_UpdateLoginSuccess` - Track successful login
4. `sp_GetUserById` - Get user details
5. `sp_GetUsersByCompanyBranch` - List users
6. `sp_CreateCompany` - Create company
7. `sp_CreateBranch` - Create branch
8. `sp_GetBranchesByCompany` - List branches
9. `sp_CreateCylinder` - Add cylinder
10. `sp_GetCylindersByCompanyBranch` - List cylinders
11. `sp_CreateCylinderTest` - Record test
12. `sp_GetCylinderTests` - Get test history

### Sample Data:
- **2 Companies:**
  - COMP001 - Cystra Industries (NYC, USA)
  - COMP002 - Global Gas Solutions (London, UK)
  
- **3 Branches:**
  - COMP001/BR001 - Main Branch NYC
  - COMP001/BR002 - West Branch LA
  - COMP002/BR001 - Central London

---

## ✅ Verification

### Check if database is initialized:

**Option 1: Using npm script**
```bash
npm run db:init
# If already initialized, it will say "already exists"
```

**Option 2: Using Node.js**
```javascript
const db = require('./db');

db.testConnection()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.log('❌ Database not initialized'));
```

**Option 3: Using SQL query**
```sql
-- Check tables
SELECT TABLE_NAME 
FROM cystra_db.INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';

-- Check stored procedures
SELECT ROUTINE_NAME 
FROM cystra_db.INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_TYPE = 'PROCEDURE';

-- Check sample data
SELECT COUNT(*) FROM cystra_db.dbo.companies;
SELECT COUNT(*) FROM cystra_db.dbo.branches;
```

---

## 🚨 Troubleshooting

### Error: "Cannot connect to SQL Server"

**Check:**
1. Is SQL Server running?
   ```bash
   # Check if port 1433 is open
   lsof -i :1433
   ```

2. Is SQL Server configured for TCP/IP?
   - Open SQL Server Configuration Manager
   - Enable TCP/IP for SQL Server

3. Are credentials correct in `.env`?
   ```env
   DB_HOST=localhost
   DB_PORT=1433
   DB_USER=sa
   DB_PASSWORD=Vaishnoma@2
   ```

### Error: "Login failed for user 'sa'"

**Solutions:**
1. Check password is correct
2. Enable SQL Server authentication (not just Windows auth)
3. Verify user has CREATE DATABASE permission

### Error: "Schema file not found"

**Check:**
1. File exists: `db/company_branch_schema.sql`
2. You're running from project root directory
3. File path is correct in script

### Database created but empty?

**Run:**
```bash
npm run db:init
```
This will create all tables and procedures even if database exists.

---

## 📝 Best Practices

### 1. **Use npm script for initialization**
```bash
npm run db:init
```
Easiest and most reliable method.

### 2. **Initialize before first run**
Don't rely on auto-initialization in production.

### 3. **Backup before re-running**
If you have important data:
```bash
# Backup first
sqlcmd -S localhost -U sa -P Vaishnoma@2 -Q "BACKUP DATABASE cystra_db TO DISK='cystra_backup.bak'"

# Then re-initialize
npm run db:init
```

### 4. **Version control your schema**
The `db/company_branch_schema.sql` file is in git - any changes are tracked.

### 5. **Test in development first**
Always test schema changes in development before production.

---

## 🎯 Recommended Workflow

### For Development:
```bash
# First time setup
npm install
npm run db:init
npm run dev

# After pulling updates
npm run db:init  # Re-run if schema changed
npm run dev
```

### For Production:
```bash
# Initial deployment
npm install
npm run db:init
npm start

# For updates
npm run db:init  # If schema changed
npm start
```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Initialize database | `npm run db:init` |
| Start API (production) | `npm start` |
| Start API (development) | `npm run dev` |
| Check if initialized | `npm run db:init` (will say if exists) |
| View sample companies | See script output or query database |
| Reset database | Drop DB, then `npm run db:init` |

---

## 💡 Pro Tips

1. **Keep the script handy:** Bookmark `npm run db:init` - you'll use it often during development

2. **Sample data is your friend:** The script creates test companies/branches - use them for testing!

3. **Safe to re-run:** Don't worry about running `npm run db:init` multiple times

4. **Check the output:** The script shows exactly what was created - review it!

5. **Automate in CI/CD:** Add `npm run db:init` to your deployment pipeline

---

**Your database initialization is now as simple as running one command!** 🎉

```bash
npm run db:init
```

That's it! Tables, stored procedures, and sample data will be ready to go! 🚀

