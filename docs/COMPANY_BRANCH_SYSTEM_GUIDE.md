# 🏢 Company-Branch Based User System Guide

## Overview

This is a **simplified multi-tenant system** where:
- ✅ No email verification required
- ✅ No OTP required
- ✅ **Company** and **Branch** are the key identifiers
- ✅ Users register with Company and Branch information
- ✅ All data is isolated by Company-Branch combination
- ✅ Users can directly register and login

---

## 🗄️ Database Architecture

### Multi-Tenant Structure

```
Company (e.g., "Cystra Industries")
  ├── Branch 1 (e.g., "NYC Main Branch")
  │   ├── Users
  │   ├── Cylinders
  │   └── Cylinder Tests
  ├── Branch 2 (e.g., "LA Branch")
  │   ├── Users
  │   ├── Cylinders
  │   └── Cylinder Tests
```

---

## 📊 Database Tables

### 1. **companies**
Main company table
- `id` - Primary key
- `company_code` - Unique company identifier (e.g., "COMP001")
- `company_name` - Company name
- `address`, `city`, `state`, `country` - Location info
- `phone`, `email`, `website` - Contact info
- `tax_id` - Tax identification
- `is_active` - Active status

### 2. **branches**
Company branches
- `id` - Primary key
- `company_id` - Foreign key to companies
- `branch_code` - Unique within company (e.g., "BR001")
- `branch_name` - Branch name
- `address`, `city`, `state` - Location info
- `phone`, `email` - Contact info
- `manager_name` - Branch manager
- `is_active` - Active status

### 3. **users**
Users belong to a specific Company-Branch
- `id` - Primary key
- `company_id` - Foreign key to companies (KEY IDENTIFIER)
- `branch_id` - Foreign key to branches (KEY IDENTIFIER)
- `username` - Unique within company-branch
- `email` - Unique globally
- `password_hash` - Hashed password
- `first_name`, `last_name`, `phone` - Personal info
- `role` - Admin, Manager, User, Operator
- `is_active` - Active status
- `last_login_at` - Last login timestamp

**Important:** Username is unique per company-branch, not globally!

### 4. **cylinders**
Gas cylinders managed by Company-Branch
- `id` - Primary key
- `company_id` - Foreign key (KEY IDENTIFIER)
- `branch_id` - Foreign key (KEY IDENTIFIER)
- `cylinder_code` - Unique within company-branch
- `serial_number` - Manufacturer serial number (**optional / nullable**)
- `cylinder_family_code` - Family/group code (**required / NOT NULL**)
- `cylinder_type`, `capacity`, `manufacturer` - Cylinder details
- `manufacture_date`, `last_test_date`, `next_test_date` - Dates
- `status` - Available, In Use, Testing, Maintenance, Retired

### 5. **cylinder_tests**
Test records for cylinders
- `id` - Primary key
- `company_id` - Foreign key (KEY IDENTIFIER)
- `branch_id` - Foreign key (KEY IDENTIFIER)
- `cylinder_id` - Foreign key to cylinders
- `test_date`, `test_type`, `test_result` - Test details
- `test_pressure`, `inspector_name`, `notes` - Additional info
- `tested_by` - Foreign key to users

### 6. **user_activity_log**
Audit trail
- `id` - Primary key
- `company_id`, `branch_id` - Foreign keys (KEY IDENTIFIERS)
- `user_id` - Foreign key to users
- `activity_type`, `description` - Activity details
- `ip_address` - IP tracking

---

## 🔧 Stored Procedures

### 1. **sp_RegisterUser** - Simple Registration

**Purpose:** Register a new user (no email verification needed)

**Parameters:**
```sql
@company_id INT -- Required: Which company
@branch_id INT -- Required: Which branch
@username NVARCHAR(50) -- Required
@email NVARCHAR(100) -- Required
@password_hash NVARCHAR(255) -- Required (pre-hashed)
@first_name NVARCHAR(50) -- Required
@last_name NVARCHAR(50) -- Optional
@phone NVARCHAR(20) -- Optional
@role NVARCHAR(50) -- Optional (default: 'User')
@user_id INT OUTPUT -- Returns new user ID
@error_message NVARCHAR(500) OUTPUT -- Returns message
```

**Usage Example:**
```sql
DECLARE @uid INT, @msg NVARCHAR(500);

EXEC sp_RegisterUser 
  @company_id = 1,
  @branch_id = 1,
  @username = 'johndoe',
  @email = 'john@example.com',
  @password_hash = '$2a$10$...',
  @first_name = 'John',
  @last_name = 'Doe',
  @phone = '+1234567890',
  @role = 'User',
  @user_id = @uid OUTPUT,
  @error_message = @msg OUTPUT;

SELECT @uid AS UserId, @msg AS Message;
```

**Return Codes:**
- `0` - Success
- `-1` - Invalid or inactive company
- `-2` - Invalid or inactive branch
- `-3` - Username already exists in this branch
- `-4` - Email already exists

**After Registration:** User can immediately login!

---

### 2. **sp_UserLogin** - Simple Login

**Purpose:** Login user and get company-branch context

**Parameters:**
```sql
@email NVARCHAR(100) -- Required
@ip_address NVARCHAR(50) -- Optional
@user_id INT OUTPUT -- Returns user ID
@company_id INT OUTPUT -- Returns company ID
@branch_id INT OUTPUT -- Returns branch ID
@password_hash NVARCHAR(255) OUTPUT -- Returns stored password
@is_active BIT OUTPUT -- Returns if active
@role NVARCHAR(50) OUTPUT -- Returns user role
@error_message NVARCHAR(500) OUTPUT
```

**Usage Example:**
```sql
DECLARE @uid INT, @cid INT, @bid INT, @pwd NVARCHAR(255);
DECLARE @active BIT, @role NVARCHAR(50), @msg NVARCHAR(500);

EXEC sp_UserLogin 
  @email = 'john@example.com',
  @ip_address = '192.168.1.1',
  @user_id = @uid OUTPUT,
  @company_id = @cid OUTPUT,
  @branch_id = @bid OUTPUT,
  @password_hash = @pwd OUTPUT,
  @is_active = @active OUTPUT,
  @role = @role OUTPUT,
  @error_message = @msg OUTPUT;

-- Now verify password in your application
-- If password matches, call sp_UpdateLoginSuccess
SELECT @uid, @cid, @bid, @role;
```

**Important:** Returns company_id and branch_id - these identify the user's context!

---

### 3. **sp_UpdateLoginSuccess** - After Successful Login

**Usage:**
```sql
EXEC sp_UpdateLoginSuccess 
  @user_id = 1,
  @ip_address = '192.168.1.1';
```

---

### 4. **sp_GetUserById** - Get User Details

**Returns:** Complete user info including company and branch details

```sql
EXEC sp_GetUserById @user_id = 1;
```

**Returns columns:**
- User info (id, username, email, name, phone, role)
- Company info (company_id, company_code, company_name)
- Branch info (branch_id, branch_code, branch_name)

---

### 5. **sp_GetUsersByCompanyBranch** - Get All Users

**Purpose:** Get users filtered by company and optionally branch

```sql
-- Get all users in a company
EXEC sp_GetUsersByCompanyBranch 
  @company_id = 1,
  @branch_id = NULL,
  @is_active = 1;

-- Get users in a specific branch
EXEC sp_GetUsersByCompanyBranch 
  @company_id = 1,
  @branch_id = 2,
  @is_active = 1;
```

---

### 6. **sp_CreateCompany** - Create Company

```sql
DECLARE @cid INT, @msg NVARCHAR(500);

EXEC sp_CreateCompany 
  @company_code = 'COMP001',
  @company_name = 'Cystra Industries',
  @city = 'New York',
  @country = 'USA',
  @phone = '+1-555-0001',
  @email = 'info@cystra.com',
  @company_id = @cid OUTPUT,
  @error_message = @msg OUTPUT;
```

---

### 7. **sp_CreateBranch** - Create Branch

```sql
DECLARE @bid INT, @msg NVARCHAR(500);

EXEC sp_CreateBranch 
  @company_id = 1,
  @branch_code = 'BR001',
  @branch_name = 'Main Branch',
  @city = 'New York',
  @phone = '+1-555-1001',
  @email = 'main@cystra.com',
  @manager_name = 'John Smith',
  @branch_id = @bid OUTPUT,
  @error_message = @msg OUTPUT;
```

---

### 8. **sp_GetBranchesByCompany** - Get Branches

```sql
EXEC sp_GetBranchesByCompany 
  @company_id = 1,
  @is_active = 1;
```

---

### 9. **sp_CreateCylinder** - Add Cylinder

**Purpose:** Add a cylinder to a specific company-branch

```sql
DECLARE @cyl_id INT, @msg NVARCHAR(500);

EXEC sp_CreateCylinder 
  @company_id = 1,
  @branch_id = 1,
  @cylinder_code = 'CYL001',
  @serial_number = 'SN123456',
  @cylinder_type = 'Type A',
  @capacity = 50.00,
  @manufacturer = 'XYZ Corp',
  @manufacture_date = '2024-01-15',
  @created_by = 1,  -- User ID
  @cylinder_id = @cyl_id OUTPUT,
  @error_message = @msg OUTPUT;
```

---

### 10. **sp_GetCylindersByCompanyBranch** - Get Cylinders

**Purpose:** Get cylinders filtered by company-branch

```sql
-- Get all cylinders for a company
EXEC sp_GetCylindersByCompanyBranch 
  @company_id = 1,
  @branch_id = NULL,
  @status = NULL;

-- Get cylinders for a specific branch
EXEC sp_GetCylindersByCompanyBranch 
  @company_id = 1,
  @branch_id = 2,
  @status = 'Available';
```

---

### 11. **sp_CreateCylinderTest** - Record Test

**Purpose:** Record a cylinder test

```sql
DECLARE @test_id INT, @msg NVARCHAR(500);

EXEC sp_CreateCylinderTest 
  @company_id = 1,
  @branch_id = 1,
  @cylinder_id = 1,
  @test_date = '2024-11-24',
  @test_type = 'Hydrostatic',
  @test_pressure = 300.00,
  @test_result = 'Pass',
  @inspector_name = 'Mike Johnson',
  @notes = 'All tests passed successfully',
  @next_test_date = '2025-11-24',
  @tested_by = 1,  -- User ID
  @test_id = @test_id OUTPUT,
  @error_message = @msg OUTPUT;
```

---

### 12. **sp_GetCylinderTests** - Get Test History

```sql
-- Get all tests for a company
EXEC sp_GetCylinderTests 
  @company_id = 1,
  @branch_id = NULL,
  @cylinder_id = NULL,
  @test_type = NULL;

-- Get tests for a specific cylinder
EXEC sp_GetCylinderTests 
  @company_id = 1,
  @branch_id = 1,
  @cylinder_id = 5,
  @test_type = NULL;
```

---

## 🔄 Complete Registration & Login Flow

### Registration Flow:
```sql
-- Step 1: Create company (one-time, usually by admin)
DECLARE @comp_id INT, @msg NVARCHAR(500);
EXEC sp_CreateCompany 
  @company_code = 'COMP001',
  @company_name = 'My Company',
  @company_id = @comp_id OUTPUT,
  @error_message = @msg OUTPUT;

-- Step 2: Create branch (one-time)
DECLARE @branch_id INT;
EXEC sp_CreateBranch 
  @company_id = @comp_id,
  @branch_code = 'BR001',
  @branch_name = 'Main Branch',
  @branch_id = @branch_id OUTPUT,
  @error_message = @msg OUTPUT;

-- Step 3: Register user (user signs up)
DECLARE @user_id INT;
EXEC sp_RegisterUser 
  @company_id = @comp_id,
  @branch_id = @branch_id,
  @username = 'johndoe',
  @email = 'john@example.com',
  @password_hash = '$2a$10$hashed_password',
  @first_name = 'John',
  @last_name = 'Doe',
  @user_id = @user_id OUTPUT,
  @error_message = @msg OUTPUT;

-- Done! User can now login immediately (no email verification)
```

### Login Flow:
```sql
-- Step 1: Get user details by email
DECLARE @uid INT, @cid INT, @bid INT, @pwd NVARCHAR(255);
DECLARE @active BIT, @role NVARCHAR(50), @msg NVARCHAR(500);

EXEC sp_UserLogin 
  @email = 'john@example.com',
  @ip_address = '192.168.1.1',
  @user_id = @uid OUTPUT,
  @company_id = @cid OUTPUT,
  @branch_id = @bid OUTPUT,
  @password_hash = @pwd OUTPUT,
  @is_active = @active OUTPUT,
  @role = @role OUTPUT,
  @error_message = @msg OUTPUT;

-- Step 2: Verify password in your Node.js application
-- bcrypt.compare(userInputPassword, @pwd)

-- Step 3: If password matches
EXEC sp_UpdateLoginSuccess 
  @user_id = @uid,
  @ip_address = '192.168.1.1';

-- Step 4: Store company_id and branch_id in session/JWT
-- These are used for all subsequent operations
```

---

## 🔑 Key Identifiers Explained

### Why Company and Branch are Important:

1. **Data Isolation:**
   - Each company's data is separate
   - Each branch within a company has its own data
   - Users can only see data from their company-branch

2. **Multi-Tenant Architecture:**
   - One database, multiple companies
   - Each company can have multiple branches
   - Perfect for SaaS applications

3. **Access Control:**
   - Users belong to specific company-branch
   - Data queries always filter by company_id and branch_id
   - Prevents data leakage between companies

4. **Scalability:**
   - Easy to add new companies and branches
   - No database schema changes needed
   - Simple to manage permissions

---

## 📝 Sample Data

The script automatically inserts sample data:

### Companies:
- **COMP001** - Cystra Industries (NYC, USA)
- **COMP002** - Global Gas Solutions (London, UK)

### Branches:
- **COMP001/BR001** - Main Branch - NYC
- **COMP001/BR002** - West Branch - LA
- **COMP002/BR001** - Central London

You can register users for these companies/branches for testing!

---

## 🚀 Installation

### Option 1: Azure Data Studio
1. Open Azure Data Studio
2. Connect to SQL Server (localhost:1433, user: sa)
3. Open file: `db/company_branch_schema.sql`
4. Press F5 to execute

### Option 2: Command Line
```bash
sqlcmd -S localhost -U sa -P Vaishnoma@2 -d cystra_db -i "db/company_branch_schema.sql"
```

---

## 🔒 Security Features

✅ **Password Hashing** - Passwords are hashed before storage  
✅ **Company-Branch Isolation** - Data is isolated per tenant  
✅ **Activity Logging** - All actions are logged  
✅ **Role-Based Access** - Admin, Manager, User, Operator roles  
✅ **Active Status** - Can deactivate users/companies/branches  

---

## ✅ Key Differences from Previous System

| Feature | Old System | New System |
|---------|-----------|------------|
| Email Verification | ✅ Required | ❌ Not Required |
| OTP | ✅ Required | ❌ Not Required |
| Company/Branch | ❌ Not included | ✅ **KEY IDENTIFIERS** |
| Registration | Complex | **Simple & Direct** |
| Login | Multi-step | **Immediate** |
| Data Isolation | Single tenant | **Multi-tenant** |

---

## 💡 Best Practices

1. **Always filter by company_id and branch_id** in your queries
2. **Store company_id and branch_id in JWT** after login
3. **Validate company-branch** access for every request
4. **Use roles** for permission management
5. **Log all activities** for audit trail

---

## 🧪 Testing Examples

```sql
-- Test 1: Create a test company
DECLARE @cid INT, @msg NVARCHAR(500);
EXEC sp_CreateCompany 'TEST001', 'Test Company', @cid OUTPUT, @msg OUTPUT;
SELECT @cid, @msg;

-- Test 2: Create a branch
DECLARE @bid INT;
EXEC sp_CreateBranch @cid, 'BR001', 'Test Branch', @bid OUTPUT, @msg OUTPUT;
SELECT @bid, @msg;

-- Test 3: Register a user
DECLARE @uid INT;
EXEC sp_RegisterUser @cid, @bid, 'testuser', 'test@test.com', 'hash123', 
     'Test', 'User', NULL, 'User', @uid OUTPUT, @msg OUTPUT;
SELECT @uid, @msg;

-- Test 4: Login
DECLARE @uid2 INT, @cid2 INT, @bid2 INT, @pwd NVARCHAR(255);
DECLARE @active BIT, @role NVARCHAR(50);
EXEC sp_UserLogin 'test@test.com', '127.0.0.1', 
     @uid2 OUTPUT, @cid2 OUTPUT, @bid2 OUTPUT, @pwd OUTPUT, 
     @active OUTPUT, @role OUTPUT, @msg OUTPUT;
SELECT @uid2, @cid2, @bid2, @active, @role;

-- Test 5: Get users
EXEC sp_GetUsersByCompanyBranch @cid, NULL, 1;

-- Test 6: Create cylinder
DECLARE @cylid INT;
EXEC sp_CreateCylinder @cid, @bid, 'CYL001', 'SN001', 'TypeA', 50, 
     'XYZ', '2024-01-01', @uid, @cylid OUTPUT, @msg OUTPUT;
SELECT @cylid, @msg;

-- Test 7: Get cylinders
EXEC sp_GetCylindersByCompanyBranch @cid, @bid, NULL;
```

---

**Your simplified company-branch system is ready to use!** 🎉

No email verification, no OTP - just simple registration with company and branch details!

