-- ============================================================
-- Company-Branch Based User System
-- Database: cystra_db (SQL Server)
-- Multi-tenant architecture with Company and Branch isolation
-- ============================================================

USE cystra_db;
GO

-- ============================================================
-- TABLE 1: Companies
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'companies')
BEGIN
  CREATE TABLE companies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_code NVARCHAR(50) NOT NULL UNIQUE,
    company_name NVARCHAR(200) NOT NULL,
    address NVARCHAR(500),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country NVARCHAR(100),
    postal_code NVARCHAR(20),
    phone NVARCHAR(20),
    email NVARCHAR(100),
    website NVARCHAR(200),
    tax_id NVARCHAR(50),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
  );
  
  CREATE INDEX idx_company_code ON companies(company_code);
  CREATE INDEX idx_is_active ON companies(is_active);
  
  PRINT 'Table companies created successfully';
END
GO

-- ============================================================
-- TABLE 2: Branches
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'branches')
BEGIN
  CREATE TABLE branches (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    branch_code NVARCHAR(50) NOT NULL,
    branch_name NVARCHAR(200) NOT NULL,
    address NVARCHAR(500),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country NVARCHAR(100),
    postal_code NVARCHAR(20),
    phone NVARCHAR(20),
    email NVARCHAR(100),
    manager_name NVARCHAR(100),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE (company_id, branch_code)
  );
  
  CREATE INDEX idx_company_id ON branches(company_id);
  CREATE INDEX idx_branch_code ON branches(branch_code);
  CREATE INDEX idx_is_active ON branches(is_active);
  
  PRINT 'Table branches created successfully';
END
GO

-- ============================================================
-- TABLE 3: Users (Simplified with Company-Branch)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
  CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    branch_id INT NOT NULL,
    username NVARCHAR(50) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50),
    phone NVARCHAR(20),
    role NVARCHAR(50) DEFAULT 'User' CHECK (role IN ('Admin', 'Manager', 'User', 'Operator')),
    is_active BIT DEFAULT 1,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    UNIQUE (company_id, branch_id, username),
    UNIQUE (email)
  );
  
  CREATE INDEX idx_company_branch ON users(company_id, branch_id);
  CREATE INDEX idx_username ON users(username);
  CREATE INDEX idx_email ON users(email);
  CREATE INDEX idx_is_active ON users(is_active);
  
  PRINT 'Table users created successfully';
END
GO

-- ============================================================
-- TABLE 4: Cylinder Master
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cylinders')
BEGIN
  CREATE TABLE cylinders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    branch_id INT NOT NULL,
    cylinder_code NVARCHAR(50) NOT NULL,
    serial_number NVARCHAR(100) NULL,
    barcode_number NVARCHAR(100),
    cylinder_type NVARCHAR(50),
    cylinder_family_code NVARCHAR(50) NOT NULL,
    gas_content NVARCHAR(50) NULL,
    manufacture_no NVARCHAR(100) NULL,
    challan_no NVARCHAR(50) NULL,
    capacity DECIMAL(10, 2),
    capacity_unit NVARCHAR(20) DEFAULT 'Liters',
    manufacturer NVARCHAR(100),
    manufacture_date DATE,
    last_test_date DATE,
    next_test_date DATE,
    owner_type NVARCHAR(10) NOT NULL,
    owner_party_id INT NULL,
    current_holder_party_id INT NULL,
    ownership_remarks NVARCHAR(250) NULL,
    status NVARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'In Use', 'Testing', 'Maintenance', 'Retired')),
    is_active BIT DEFAULT 1,
    created_by INT,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE (company_id, branch_id, cylinder_code)
  );
  
  CREATE INDEX idx_company_branch ON cylinders(company_id, branch_id);
  CREATE INDEX idx_cylinder_code ON cylinders(cylinder_code);
  CREATE INDEX idx_serial_number ON cylinders(serial_number);
  CREATE INDEX idx_status ON cylinders(status);
  
  PRINT 'Table cylinders created successfully';
END
GO

-- ============================================================
-- TABLE 5: Cylinder Tests
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cylinder_tests')
BEGIN
  CREATE TABLE cylinder_tests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    branch_id INT NOT NULL,
    cylinder_id INT NOT NULL,
    test_date DATE NOT NULL,
    test_type NVARCHAR(50) NOT NULL CHECK (test_type IN ('Hydrostatic', 'Visual', 'Leak', 'Pressure', 'Internal')),
    test_pressure DECIMAL(10, 2),
    test_result NVARCHAR(20) CHECK (test_result IN ('Pass', 'Fail', 'Conditional')),
    inspector_name NVARCHAR(100),
    notes NVARCHAR(MAX),
    next_test_date DATE,
    tested_by INT,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (cylinder_id) REFERENCES cylinders(id),
    FOREIGN KEY (tested_by) REFERENCES users(id)
  );
  
  CREATE INDEX idx_company_branch ON cylinder_tests(company_id, branch_id);
  CREATE INDEX idx_cylinder_id ON cylinder_tests(cylinder_id);
  CREATE INDEX idx_test_date ON cylinder_tests(test_date);
  CREATE INDEX idx_test_type ON cylinder_tests(test_type);
  
  PRINT 'Table cylinder_tests created successfully';
END
GO

-- ============================================================
-- TABLE 6: User Activity Log
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_activity_log')
BEGIN
  CREATE TABLE user_activity_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    branch_id INT NOT NULL,
    user_id INT NOT NULL,
    activity_type NVARCHAR(50) NOT NULL,
    description NVARCHAR(500),
    ip_address NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE INDEX idx_company_branch ON user_activity_log(company_id, branch_id);
  CREATE INDEX idx_user_id ON user_activity_log(user_id);
  CREATE INDEX idx_activity_type ON user_activity_log(activity_type);
  CREATE INDEX idx_created_at ON user_activity_log(created_at);
  
  PRINT 'Table user_activity_log created successfully';
END
GO

-- ============================================================
-- STORED PROCEDURE 1: Register User
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_RegisterUser')
  DROP PROCEDURE sp_RegisterUser;
GO

CREATE PROCEDURE sp_RegisterUser
  @company_id INT,
  @branch_id INT,
  @username NVARCHAR(50),
  @email NVARCHAR(100),
  @password_hash NVARCHAR(255),
  @first_name NVARCHAR(50),
  @last_name NVARCHAR(50) = NULL,
  @phone NVARCHAR(20) = NULL,
  @role NVARCHAR(50) = 'User',
  @user_id INT OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;
    
    -- Validate company exists and is active
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = @company_id AND is_active = 1)
    BEGIN
      SET @error_message = 'Invalid or inactive company';
      ROLLBACK TRANSACTION;
      RETURN -1;
    END
    
    -- Validate branch exists, is active, and belongs to company
    IF NOT EXISTS (SELECT 1 FROM branches WHERE id = @branch_id AND company_id = @company_id AND is_active = 1)
    BEGIN
      SET @error_message = 'Invalid or inactive branch for this company';
      ROLLBACK TRANSACTION;
      RETURN -2;
    END
    
    -- Check if username already exists in this company-branch
    IF EXISTS (SELECT 1 FROM users WHERE company_id = @company_id AND branch_id = @branch_id AND username = @username)
    BEGIN
      SET @error_message = 'Username already exists in this branch';
      ROLLBACK TRANSACTION;
      RETURN -3;
    END
    
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = @email)
    BEGIN
      SET @error_message = 'Email already exists';
      ROLLBACK TRANSACTION;
      RETURN -4;
    END
    
    -- Insert new user
    INSERT INTO users (company_id, branch_id, username, email, password_hash, first_name, last_name, phone, role)
    VALUES (@company_id, @branch_id, @username, @email, @password_hash, @first_name, @last_name, @phone, @role);
    
    SET @user_id = SCOPE_IDENTITY();
    
    -- Log activity
    INSERT INTO user_activity_log (company_id, branch_id, user_id, activity_type, description)
    VALUES (@company_id, @branch_id, @user_id, 'REGISTRATION', 'User registered successfully');
    
    SET @error_message = 'User registered successfully';
    COMMIT TRANSACTION;
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;
    
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_RegisterUser created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 2: User Login
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UserLogin')
  DROP PROCEDURE sp_UserLogin;
GO

CREATE PROCEDURE sp_UserLogin
  @email NVARCHAR(100),
  @ip_address NVARCHAR(50) = NULL,
  @user_id INT OUTPUT,
  @company_id INT OUTPUT,
  @branch_id INT OUTPUT,
  @password_hash NVARCHAR(255) OUTPUT,
  @is_active BIT OUTPUT,
  @role NVARCHAR(50) OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Get user details
    SELECT 
      @user_id = id,
      @company_id = company_id,
      @branch_id = branch_id,
      @password_hash = password_hash,
      @is_active = is_active,
      @role = role
    FROM users
    WHERE email = @email;
    
    -- Check if user exists
    IF @user_id IS NULL
    BEGIN
      SET @error_message = 'Invalid credentials';
      RETURN -1;
    END
    
    -- Check if account is active
    IF @is_active = 0
    BEGIN
      SET @error_message = 'Account is deactivated';
      RETURN -2;
    END
    
    -- Log activity
    INSERT INTO user_activity_log (company_id, branch_id, user_id, activity_type, description, ip_address)
    VALUES (@company_id, @branch_id, @user_id, 'LOGIN_ATTEMPT', 'User login attempt', @ip_address);
    
    SET @error_message = 'User found';
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_UserLogin created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 3: Update Login Success
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UpdateLoginSuccess')
  DROP PROCEDURE sp_UpdateLoginSuccess;
GO

CREATE PROCEDURE sp_UpdateLoginSuccess
  @user_id INT,
  @ip_address NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    DECLARE @company_id INT, @branch_id INT;
    
    -- Get company and branch
    SELECT @company_id = company_id, @branch_id = branch_id
    FROM users WHERE id = @user_id;
    
    -- Update last login
    UPDATE users
    SET last_login_at = GETDATE()
    WHERE id = @user_id;
    
    -- Log successful login
    INSERT INTO user_activity_log (company_id, branch_id, user_id, activity_type, description, ip_address)
    VALUES (@company_id, @branch_id, @user_id, 'LOGIN_SUCCESS', 'User logged in successfully', @ip_address);
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_UpdateLoginSuccess created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 4: Get User By ID
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetUserById')
  DROP PROCEDURE sp_GetUserById;
GO

CREATE PROCEDURE sp_GetUserById
  @user_id INT
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT 
    u.id,
    u.company_id,
    u.branch_id,
    c.company_code,
    c.company_name,
    b.branch_code,
    b.branch_name,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.role,
    u.is_active,
    u.last_login_at,
    u.created_at,
    u.updated_at
  FROM users u
  INNER JOIN companies c ON u.company_id = c.id
  INNER JOIN branches b ON u.branch_id = b.id
  WHERE u.id = @user_id;
END
GO

PRINT 'Stored Procedure sp_GetUserById created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 5: Get Users by Company-Branch
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetUsersByCompanyBranch')
  DROP PROCEDURE sp_GetUsersByCompanyBranch;
GO

CREATE PROCEDURE sp_GetUsersByCompanyBranch
  @company_id INT,
  @branch_id INT = NULL,
  @is_active BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT 
    u.id,
    u.company_id,
    u.branch_id,
    c.company_name,
    b.branch_name,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.role,
    u.is_active,
    u.last_login_at,
    u.created_at
  FROM users u
  INNER JOIN companies c ON u.company_id = c.id
  INNER JOIN branches b ON u.branch_id = b.id
  WHERE u.company_id = @company_id
    AND (@branch_id IS NULL OR u.branch_id = @branch_id)
    AND (@is_active IS NULL OR u.is_active = @is_active)
  ORDER BY u.created_at DESC;
END
GO

PRINT 'Stored Procedure sp_GetUsersByCompanyBranch created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 6: Create Company
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateCompany')
  DROP PROCEDURE sp_CreateCompany;
GO

CREATE PROCEDURE sp_CreateCompany
  @company_code NVARCHAR(50),
  @company_name NVARCHAR(200),
  @address NVARCHAR(500) = NULL,
  @city NVARCHAR(100) = NULL,
  @state NVARCHAR(100) = NULL,
  @country NVARCHAR(100) = NULL,
  @phone NVARCHAR(20) = NULL,
  @email NVARCHAR(100) = NULL,
  @company_id INT OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Check if company code already exists
    IF EXISTS (SELECT 1 FROM companies WHERE company_code = @company_code)
    BEGIN
      SET @error_message = 'Company code already exists';
      RETURN -1;
    END
    
    -- Insert company
    INSERT INTO companies (company_code, company_name, address, city, state, country, phone, email)
    VALUES (@company_code, @company_name, @address, @city, @state, @country, @phone, @email);
    
    SET @company_id = SCOPE_IDENTITY();
    SET @error_message = 'Company created successfully';
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_CreateCompany created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 7: Create Branch
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateBranch')
  DROP PROCEDURE sp_CreateBranch;
GO

CREATE PROCEDURE sp_CreateBranch
  @company_id INT,
  @branch_code NVARCHAR(50),
  @branch_name NVARCHAR(200),
  @address NVARCHAR(500) = NULL,
  @city NVARCHAR(100) = NULL,
  @state NVARCHAR(100) = NULL,
  @phone NVARCHAR(20) = NULL,
  @email NVARCHAR(100) = NULL,
  @manager_name NVARCHAR(100) = NULL,
  @branch_id INT OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Validate company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = @company_id)
    BEGIN
      SET @error_message = 'Company not found';
      RETURN -1;
    END
    
    -- Check if branch code already exists for this company
    IF EXISTS (SELECT 1 FROM branches WHERE company_id = @company_id AND branch_code = @branch_code)
    BEGIN
      SET @error_message = 'Branch code already exists for this company';
      RETURN -2;
    END
    
    -- Insert branch
    INSERT INTO branches (company_id, branch_code, branch_name, address, city, state, phone, email, manager_name)
    VALUES (@company_id, @branch_code, @branch_name, @address, @city, @state, @phone, @email, @manager_name);
    
    SET @branch_id = SCOPE_IDENTITY();
    SET @error_message = 'Branch created successfully';
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_CreateBranch created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 8: Get Branches by Company
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetBranchesByCompany')
  DROP PROCEDURE sp_GetBranchesByCompany;
GO

CREATE PROCEDURE sp_GetBranchesByCompany
  @company_id INT,
  @is_active BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT 
    b.id,
    b.company_id,
    c.company_name,
    b.branch_code,
    b.branch_name,
    b.address,
    b.city,
    b.state,
    b.phone,
    b.email,
    b.manager_name,
    b.is_active,
    b.created_at
  FROM branches b
  INNER JOIN companies c ON b.company_id = c.id
  WHERE b.company_id = @company_id
    AND (@is_active IS NULL OR b.is_active = @is_active)
  ORDER BY b.branch_name;
END
GO

PRINT 'Stored Procedure sp_GetBranchesByCompany created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 9: Create Cylinder
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateCylinder')
  DROP PROCEDURE sp_CreateCylinder;
GO

CREATE PROCEDURE sp_CreateCylinder
  @company_id INT,
  @branch_id INT,
  @cylinder_code NVARCHAR(50),
  @serial_number NVARCHAR(100),
  @cylinder_type NVARCHAR(50),
  @capacity DECIMAL(10, 2),
  @manufacturer NVARCHAR(100) = NULL,
  @manufacture_date DATE = NULL,
  @created_by INT,
  @cylinder_id INT OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Validate company-branch
    IF NOT EXISTS (SELECT 1 FROM branches WHERE id = @branch_id AND company_id = @company_id)
    BEGIN
      SET @error_message = 'Invalid branch for this company';
      RETURN -1;
    END
    
    -- Check if cylinder code already exists for this company-branch
    IF EXISTS (SELECT 1 FROM cylinders WHERE company_id = @company_id AND branch_id = @branch_id AND cylinder_code = @cylinder_code)
    BEGIN
      SET @error_message = 'Cylinder code already exists for this branch';
      RETURN -2;
    END
    
    -- Insert cylinder
    INSERT INTO cylinders (company_id, branch_id, cylinder_code, serial_number, cylinder_type, 
                          capacity, manufacturer, manufacture_date, created_by)
    VALUES (@company_id, @branch_id, @cylinder_code, @serial_number, @cylinder_type,
            @capacity, @manufacturer, @manufacture_date, @created_by);
    
    SET @cylinder_id = SCOPE_IDENTITY();
    SET @error_message = 'Cylinder created successfully';
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_CreateCylinder created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 10: Get Cylinders by Company-Branch
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetCylindersByCompanyBranch')
  DROP PROCEDURE sp_GetCylindersByCompanyBranch;
GO

CREATE PROCEDURE sp_GetCylindersByCompanyBranch
  @company_id INT,
  @branch_id INT = NULL,
  @status NVARCHAR(20) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT 
    cy.id,
    cy.company_id,
    cy.branch_id,
    c.company_name,
    b.branch_name,
    cy.cylinder_code,
    cy.serial_number,
    cy.cylinder_type,
    cy.capacity,
    cy.capacity_unit,
    cy.manufacturer,
    cy.manufacture_date,
    cy.last_test_date,
    cy.next_test_date,
    cy.status,
    cy.is_active,
    cy.created_at
  FROM cylinders cy
  INNER JOIN companies c ON cy.company_id = c.id
  INNER JOIN branches b ON cy.branch_id = b.id
  WHERE cy.company_id = @company_id
    AND (@branch_id IS NULL OR cy.branch_id = @branch_id)
    AND (@status IS NULL OR cy.status = @status)
  ORDER BY cy.created_at DESC;
END
GO

PRINT 'Stored Procedure sp_GetCylindersByCompanyBranch created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 11: Create Cylinder Test
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateCylinderTest')
  DROP PROCEDURE sp_CreateCylinderTest;
GO

CREATE PROCEDURE sp_CreateCylinderTest
  @company_id INT,
  @branch_id INT,
  @cylinder_id INT,
  @test_date DATE,
  @test_type NVARCHAR(50),
  @test_pressure DECIMAL(10, 2) = NULL,
  @test_result NVARCHAR(20),
  @inspector_name NVARCHAR(100) = NULL,
  @notes NVARCHAR(MAX) = NULL,
  @next_test_date DATE = NULL,
  @tested_by INT,
  @test_id INT OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;
    
    -- Validate cylinder belongs to company-branch
    IF NOT EXISTS (SELECT 1 FROM cylinders WHERE id = @cylinder_id AND company_id = @company_id AND branch_id = @branch_id)
    BEGIN
      SET @error_message = 'Cylinder not found for this company-branch';
      ROLLBACK TRANSACTION;
      RETURN -1;
    END
    
    -- Insert test record
    INSERT INTO cylinder_tests (company_id, branch_id, cylinder_id, test_date, test_type, 
                                test_pressure, test_result, inspector_name, notes, 
                                next_test_date, tested_by)
    VALUES (@company_id, @branch_id, @cylinder_id, @test_date, @test_type,
            @test_pressure, @test_result, @inspector_name, @notes,
            @next_test_date, @tested_by);
    
    SET @test_id = SCOPE_IDENTITY();
    
    -- Update cylinder's last test date and next test date
    UPDATE cylinders
    SET last_test_date = @test_date,
        next_test_date = @next_test_date,
        updated_at = GETDATE()
    WHERE id = @cylinder_id;
    
    SET @error_message = 'Cylinder test recorded successfully';
    COMMIT TRANSACTION;
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_CreateCylinderTest created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 12: Get Cylinder Tests
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetCylinderTests')
  DROP PROCEDURE sp_GetCylinderTests;
GO

CREATE PROCEDURE sp_GetCylinderTests
  @company_id INT,
  @branch_id INT = NULL,
  @cylinder_id INT = NULL,
  @test_type NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT 
    ct.id,
    ct.company_id,
    ct.branch_id,
    c.company_name,
    b.branch_name,
    ct.cylinder_id,
    cy.cylinder_code,
    cy.serial_number,
    ct.test_date,
    ct.test_type,
    ct.test_pressure,
    ct.test_result,
    ct.inspector_name,
    ct.notes,
    ct.next_test_date,
    u.first_name + ' ' + ISNULL(u.last_name, '') AS tested_by_name,
    ct.created_at
  FROM cylinder_tests ct
  INNER JOIN companies c ON ct.company_id = c.id
  INNER JOIN branches b ON ct.branch_id = b.id
  INNER JOIN cylinders cy ON ct.cylinder_id = cy.id
  LEFT JOIN users u ON ct.tested_by = u.id
  WHERE ct.company_id = @company_id
    AND (@branch_id IS NULL OR ct.branch_id = @branch_id)
    AND (@cylinder_id IS NULL OR ct.cylinder_id = @cylinder_id)
    AND (@test_type IS NULL OR ct.test_type = @test_type)
  ORDER BY ct.test_date DESC;
END
GO

PRINT 'Stored Procedure sp_GetCylinderTests created successfully';
GO

-- ============================================================
-- Insert Sample Data
-- ============================================================

-- Sample Companies
IF NOT EXISTS (SELECT 1 FROM companies WHERE company_code = 'COMP001')
BEGIN
  INSERT INTO companies (company_code, company_name, city, country, phone, email)
  VALUES 
  ('COMP001', 'Cystra Industries', 'New York', 'USA', '+1-555-0001', 'info@cystra.com'),
  ('COMP002', 'Global Gas Solutions', 'London', 'UK', '+44-20-5550002', 'contact@globalgass.com');
  
  PRINT 'Sample companies inserted';
END
GO

-- Sample Branches
DECLARE @comp1_id INT, @comp2_id INT;
SELECT @comp1_id = id FROM companies WHERE company_code = 'COMP001';
SELECT @comp2_id = id FROM companies WHERE company_code = 'COMP002';

IF @comp1_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches WHERE company_id = @comp1_id AND branch_code = 'BR001')
BEGIN
  INSERT INTO branches (company_id, branch_code, branch_name, city, phone, email, manager_name)
  VALUES 
  (@comp1_id, 'BR001', 'Main Branch - NYC', 'New York', '+1-555-1001', 'nyc@cystra.com', 'John Smith'),
  (@comp1_id, 'BR002', 'West Branch - LA', 'Los Angeles', '+1-555-1002', 'la@cystra.com', 'Jane Doe');
  
  PRINT 'Sample branches for COMP001 inserted';
END
GO

IF @comp2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches WHERE company_id = @comp2_id AND branch_code = 'BR001')
BEGIN
  INSERT INTO branches (company_id, branch_code, branch_name, city, phone, email, manager_name)
  VALUES 
  (@comp2_id, 'BR001', 'Central London', 'London', '+44-20-5551001', 'london@globalgass.com', 'David Wilson');
  
  PRINT 'Sample branches for COMP002 inserted';
END
GO

-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT 'Company-Branch Based System Created Successfully!';
PRINT '============================================================';
PRINT 'Tables Created: 6';
PRINT 'Stored Procedures Created: 12';
PRINT '============================================================';
PRINT '';
PRINT 'Tables:';
PRINT '  1. companies';
PRINT '  2. branches';
PRINT '  3. users (with company_id, branch_id)';
PRINT '  4. cylinders (with company_id, branch_id)';
PRINT '  5. cylinder_tests (with company_id, branch_id)';
PRINT '  6. user_activity_log (with company_id, branch_id)';
PRINT '';
PRINT 'Stored Procedures:';
PRINT '  1. sp_RegisterUser (requires company_id, branch_id)';
PRINT '  2. sp_UserLogin (returns company_id, branch_id)';
PRINT '  3. sp_UpdateLoginSuccess';
PRINT '  4. sp_GetUserById';
PRINT '  5. sp_GetUsersByCompanyBranch';
PRINT '  6. sp_CreateCompany';
PRINT '  7. sp_CreateBranch';
PRINT '  8. sp_GetBranchesByCompany';
PRINT '  9. sp_CreateCylinder';
PRINT ' 10. sp_GetCylindersByCompanyBranch';
PRINT ' 11. sp_CreateCylinderTest';
PRINT ' 12. sp_GetCylinderTests';
PRINT '';
PRINT 'Sample Data:';
PRINT '  - 2 Companies inserted';
PRINT '  - 3 Branches inserted';
PRINT '============================================================';
PRINT '';
PRINT 'NO Email Verification or OTP required!';
PRINT 'Company and Branch are KEY identifiers for all operations';
PRINT '============================================================';
GO

