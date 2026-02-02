-- ============================================
-- FIX: Cylinder Table Constraints & Stored Procedures
-- Run this AFTER company_branch_schema.sql
-- ============================================
USE cystra_db;
GO

-- ============================================
-- 1. FIX: Remove case-sensitive status constraint
-- ============================================
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name LIKE '%cylinders%status%' OR parent_object_id = OBJECT_ID('cylinders'))
BEGIN
    -- Drop existing constraint on status column
    DECLARE @constraintName NVARCHAR(200);
    SELECT @constraintName = name 
    FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('cylinders') 
    AND definition LIKE '%status%';
    
    IF @constraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE cylinders DROP CONSTRAINT ' + @constraintName);
        PRINT 'Dropped status constraint: ' + @constraintName;
    END
END
GO

-- Add new constraint with lowercase values
ALTER TABLE cylinders 
ADD CONSTRAINT CK_cylinders_status 
CHECK (LOWER(status) IN ('available', 'in_use', 'testing', 'maintenance', 'retired'));
GO
PRINT 'Added new status constraint (lowercase)';
GO

-- ============================================
-- 2. FIX: Remove and update test_type constraint
-- ============================================
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('cylinder_tests'))
BEGIN
    DECLARE @testTypeConstraint NVARCHAR(200);
    SELECT @testTypeConstraint = name 
    FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('cylinder_tests') 
    AND definition LIKE '%test_type%';
    
    IF @testTypeConstraint IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE cylinder_tests DROP CONSTRAINT ' + @testTypeConstraint);
        PRINT 'Dropped test_type constraint: ' + @testTypeConstraint;
    END
END
GO

-- Add new constraint with all test types
ALTER TABLE cylinder_tests 
ADD CONSTRAINT CK_cylinder_tests_type 
CHECK (test_type IN ('Hydrostatic', 'Visual', 'Leak', 'Pressure', 'Internal', 'Pneumatic', 'Ultrasonic'));
GO
PRINT 'Added new test_type constraint';
GO

-- ============================================
-- 3. FIX: Remove and update test_result constraint
-- ============================================
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('cylinder_tests'))
BEGIN
    DECLARE @testResultConstraint NVARCHAR(200);
    SELECT @testResultConstraint = name 
    FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('cylinder_tests') 
    AND definition LIKE '%test_result%';
    
    IF @testResultConstraint IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE cylinder_tests DROP CONSTRAINT ' + @testResultConstraint);
        PRINT 'Dropped test_result constraint: ' + @testResultConstraint;
    END
END
GO

-- Add new constraint with all test results
ALTER TABLE cylinder_tests 
ADD CONSTRAINT CK_cylinder_tests_result 
CHECK (test_result IN ('Pass', 'Fail', 'Conditional'));
GO
PRINT 'Added new test_result constraint';
GO

-- ============================================
-- 4. ADD MISSING COLUMNS to cylinders table
-- ============================================

-- Add gas_type column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'gas_type')
BEGIN
    ALTER TABLE cylinders ADD gas_type NVARCHAR(50) NULL;
    PRINT 'Added column: gas_type';
END
GO

-- Add working_pressure column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'working_pressure')
BEGIN
    ALTER TABLE cylinders ADD working_pressure DECIMAL(10,2) NULL;
    PRINT 'Added column: working_pressure';
END
GO

-- Add tare_weight column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'tare_weight')
BEGIN
    ALTER TABLE cylinders ADD tare_weight DECIMAL(10,2) NULL;
    PRINT 'Added column: tare_weight';
END
GO

-- Add weight_unit column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'weight_unit')
BEGIN
    ALTER TABLE cylinders ADD weight_unit NVARCHAR(20) NULL;
    PRINT 'Added column: weight_unit';
END
GO

-- Add valve_type column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'valve_type')
BEGIN
    ALTER TABLE cylinders ADD valve_type NVARCHAR(50) NULL;
    PRINT 'Added column: valve_type';
END
GO

-- Add owner_name column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'owner_name')
BEGIN
    ALTER TABLE cylinders ADD owner_name NVARCHAR(200) NULL;
    PRINT 'Added column: owner_name';
END
GO

-- Add owner_type column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'owner_type')
BEGIN
    ALTER TABLE cylinders ADD owner_type NVARCHAR(10) NULL;
    PRINT 'Added column: owner_type';
END
GO

-- Add owner_party_id column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'owner_party_id')
BEGIN
    ALTER TABLE cylinders ADD owner_party_id INT NULL;
    PRINT 'Added column: owner_party_id';
END
GO

-- Add current_holder_party_id column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'current_holder_party_id')
BEGIN
    ALTER TABLE cylinders ADD current_holder_party_id INT NULL;
    PRINT 'Added column: current_holder_party_id';
END
GO

-- Add ownership_remarks column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'ownership_remarks')
BEGIN
    ALTER TABLE cylinders ADD ownership_remarks NVARCHAR(250) NULL;
    PRINT 'Added column: ownership_remarks';
END
GO

-- Add cylinder_family_code column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'cylinder_family_code')
BEGIN
    ALTER TABLE cylinders ADD cylinder_family_code NVARCHAR(50) NULL;
    PRINT 'Added column: cylinder_family_code';
END
GO

-- Add gas_content column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'gas_content')
BEGIN
    ALTER TABLE cylinders ADD gas_content NVARCHAR(50) NULL;
    PRINT 'Added column: gas_content';
END
GO

-- Add manufacture_no column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'manufacture_no')
BEGIN
    ALTER TABLE cylinders ADD manufacture_no NVARCHAR(100) NULL;
    PRINT 'Added column: manufacture_no';
END
GO

-- Add challan_no column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'challan_no')
BEGIN
    ALTER TABLE cylinders ADD challan_no NVARCHAR(50) NULL;
    PRINT 'Added column: challan_no';
END
GO

-- Optional safety constraint: enforce owner_party_id required when owner_type = 'PARTY'
-- This is applied ONLY if there are no violating rows.
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_cylinders_owner_party_rule')
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM cylinders
        WHERE (owner_type = 'PARTY' AND owner_party_id IS NULL)
           OR (owner_type = 'SELF' AND owner_party_id IS NOT NULL)
    )
    BEGIN
        ALTER TABLE cylinders
        ADD CONSTRAINT CK_cylinders_owner_party_rule
        CHECK (
          (owner_type = 'PARTY' AND owner_party_id IS NOT NULL)
          OR (owner_type = 'SELF' AND owner_party_id IS NULL)
        );
        PRINT 'Added constraint: CK_cylinders_owner_party_rule';
    END
    ELSE
    BEGIN
        PRINT 'Skipped adding CK_cylinders_owner_party_rule (existing data violates rule)';
    END
END
GO

-- Add location column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'location')
BEGIN
    ALTER TABLE cylinders ADD location NVARCHAR(200) NULL;
    PRINT 'Added column: location';
END
GO

-- Add remarks column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinders') AND name = 'remarks')
BEGIN
    ALTER TABLE cylinders ADD remarks NVARCHAR(MAX) NULL;
    PRINT 'Added column: remarks';
END
GO

-- ============================================
-- 5. ADD MISSING COLUMNS to cylinder_tests table
-- ============================================

-- Add inspector_id column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinder_tests') AND name = 'inspector_id')
BEGIN
    ALTER TABLE cylinder_tests ADD inspector_id NVARCHAR(50) NULL;
    PRINT 'Added column: inspector_id';
END
GO

-- Add test_certificate_number column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinder_tests') AND name = 'test_certificate_number')
BEGIN
    ALTER TABLE cylinder_tests ADD test_certificate_number NVARCHAR(100) NULL;
    PRINT 'Added column: test_certificate_number';
END
GO

-- Add test_expiry_date column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('cylinder_tests') AND name = 'test_expiry_date')
BEGIN
    ALTER TABLE cylinder_tests ADD test_expiry_date DATE NULL;
    PRINT 'Added column: test_expiry_date';
END
GO

-- ============================================
-- 6. UPDATE sp_CreateCylinder with ALL fields
-- ============================================
IF OBJECT_ID('sp_CreateCylinder', 'P') IS NOT NULL DROP PROCEDURE sp_CreateCylinder;
GO

CREATE PROCEDURE sp_CreateCylinder
    @company_id INT,
    @branch_id INT,
    @cylinder_code NVARCHAR(50),
    @serial_number NVARCHAR(100),
    @barcode_number NVARCHAR(100) = NULL,
    @cylinder_type NVARCHAR(50) = NULL,
    @gas_type NVARCHAR(50) = NULL,
    @capacity DECIMAL(10,2) = NULL,
    @capacity_unit NVARCHAR(20) = NULL,
    @working_pressure DECIMAL(10,2) = NULL,
    @tare_weight DECIMAL(10,2) = NULL,
    @weight_unit NVARCHAR(20) = NULL,
    @valve_type NVARCHAR(50) = NULL,
    @manufacturer NVARCHAR(100) = NULL,
    @manufacture_date DATE = NULL,
    @owner_name NVARCHAR(200) = NULL,
    @owner_type NVARCHAR(50) = NULL,
    @location NVARCHAR(200) = NULL,
    @last_test_date DATE = NULL,
    @next_test_date DATE = NULL,
    @status NVARCHAR(20) = 'available',
    @remarks NVARCHAR(MAX) = NULL,
    @created_by INT = NULL,
    @cylinder_id INT OUTPUT,
    @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @error_message = NULL;

    BEGIN TRY
        -- Check if company exists
        IF NOT EXISTS (SELECT 1 FROM companies WHERE id = @company_id AND is_active = 1)
        BEGIN
            SET @error_message = 'Company does not exist or is inactive';
            SET @cylinder_id = NULL;
            RETURN 1;
        END

        -- Check if branch exists
        IF NOT EXISTS (SELECT 1 FROM branches WHERE id = @branch_id AND company_id = @company_id AND is_active = 1)
        BEGIN
            SET @error_message = 'Branch does not exist for this company or is inactive';
            SET @cylinder_id = NULL;
            RETURN 1;
        END

        -- Check if cylinder_code already exists for this company-branch
        IF EXISTS (SELECT 1 FROM cylinders WHERE company_id = @company_id AND branch_id = @branch_id AND cylinder_code = @cylinder_code)
        BEGIN
            SET @error_message = 'Cylinder code already exists for this company and branch';
            SET @cylinder_id = NULL;
            RETURN 1;
        END

        -- Check if serial_number already exists for this company-branch
        IF EXISTS (SELECT 1 FROM cylinders WHERE company_id = @company_id AND branch_id = @branch_id AND serial_number = @serial_number)
        BEGIN
            SET @error_message = 'Serial number already exists for this company and branch';
            SET @cylinder_id = NULL;
            RETURN 1;
        END

        -- Insert cylinder with all fields
        INSERT INTO cylinders (
            company_id, branch_id, cylinder_code, serial_number, barcode_number,
            cylinder_type, gas_type, capacity, capacity_unit, 
            working_pressure, tare_weight, weight_unit, valve_type,
            manufacturer, manufacture_date, 
            owner_name, owner_type, location,
            last_test_date, next_test_date,
            status, remarks, is_active, created_by, created_at, updated_at
        )
        VALUES (
            @company_id, @branch_id, @cylinder_code, @serial_number, @barcode_number,
            @cylinder_type, @gas_type, @capacity, @capacity_unit,
            @working_pressure, @tare_weight, @weight_unit, @valve_type,
            @manufacturer, @manufacture_date,
            @owner_name, @owner_type, @location,
            @last_test_date, @next_test_date,
            ISNULL(@status, 'available'), @remarks, 1, @created_by, GETDATE(), GETDATE()
        );

        SET @cylinder_id = SCOPE_IDENTITY();
        SET @error_message = 'Cylinder created successfully';
        RETURN 0;

    END TRY
    BEGIN CATCH
        SET @error_message = ERROR_MESSAGE();
        SET @cylinder_id = NULL;
        RETURN 1;
    END CATCH
END;
GO
PRINT 'Updated sp_CreateCylinder with all fields';
GO

-- ============================================
-- 7. UPDATE sp_CreateCylinderTest with ALL fields
-- ============================================
IF OBJECT_ID('sp_CreateCylinderTest', 'P') IS NOT NULL DROP PROCEDURE sp_CreateCylinderTest;
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
    @inspector_id NVARCHAR(50) = NULL,
    @test_certificate_number NVARCHAR(100) = NULL,
    @test_expiry_date DATE = NULL,
    @notes NVARCHAR(MAX) = NULL,
    @next_test_date DATE = NULL,
    @tested_by INT = NULL,
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
            SET @test_id = NULL;
            RETURN -1;
        END
        
        -- Insert test record
        INSERT INTO cylinder_tests (
            company_id, branch_id, cylinder_id, test_date, test_type, 
            test_pressure, test_result, inspector_name, inspector_id,
            test_certificate_number, test_expiry_date, notes, 
            next_test_date, tested_by, created_at
        )
        VALUES (
            @company_id, @branch_id, @cylinder_id, @test_date, @test_type,
            @test_pressure, @test_result, @inspector_name, @inspector_id,
            @test_certificate_number, @test_expiry_date, @notes,
            @next_test_date, @tested_by, GETDATE()
        );
        
        SET @test_id = SCOPE_IDENTITY();
        
        -- Update cylinder's last test date and next test date
        UPDATE cylinders
        SET last_test_date = @test_date,
            next_test_date = ISNULL(@next_test_date, @test_expiry_date),
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
        SET @test_id = NULL;
        RETURN -999;
    END CATCH
END;
GO
PRINT 'Updated sp_CreateCylinderTest with all fields';
GO

-- ============================================
-- DONE!
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'FIX COMPLETE!';
PRINT '============================================';
PRINT 'Changes made:';
PRINT '  1. Updated status constraint to accept lowercase values';
PRINT '  2. Updated test_type constraint to include Pneumatic, Ultrasonic';
PRINT '  3. Added missing columns to cylinders table';
PRINT '  4. Added missing columns to cylinder_tests table';
PRINT '  5. Updated sp_CreateCylinder with all new fields';
PRINT '  6. Updated sp_CreateCylinderTest with all new fields';
PRINT '============================================';
GO
