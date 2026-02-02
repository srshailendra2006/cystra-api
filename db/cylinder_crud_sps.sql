-- ============================================
-- Cylinder CRUD Stored Procedures
-- ============================================
USE cystra_db;
GO

-- ============================================
-- 1. CREATE CYLINDER
-- ============================================
IF OBJECT_ID('sp_CreateCylinder', 'P') IS NOT NULL DROP PROCEDURE sp_CreateCylinder;
GO

CREATE PROCEDURE sp_CreateCylinder
    @company_id INT,
    @branch_id INT,
    @cylinder_code NVARCHAR(50),
    @serial_number NVARCHAR(100) = NULL,
    @barcode_number NVARCHAR(100) = NULL,
    @cylinder_type NVARCHAR(50) = NULL,
    @cylinder_family_code NVARCHAR(50) = NULL,
    @gas_content NVARCHAR(50) = NULL,
    @manufacture_no NVARCHAR(100) = NULL,
    @challan_no NVARCHAR(50) = NULL,
    @capacity DECIMAL(10,2) = NULL,
    @capacity_unit NVARCHAR(20) = NULL,
    @manufacturer NVARCHAR(100) = NULL,
    @manufacture_date DATE = NULL,
    @last_test_date DATE = NULL,
    @next_test_date DATE = NULL,
    @status NVARCHAR(20) = 'available',
    @owner_type NVARCHAR(10),
    @owner_party_id INT = NULL,
    @current_holder_party_id INT = NULL,
    @ownership_remarks NVARCHAR(250) = NULL,
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

        -- Check if serial_number already exists for this company-branch (only if provided)
        IF @serial_number IS NOT NULL AND EXISTS (
            SELECT 1
            FROM cylinders
            WHERE company_id = @company_id AND branch_id = @branch_id AND serial_number = @serial_number
        )
        BEGIN
            SET @error_message = 'Serial number already exists for this company and branch';
            SET @cylinder_id = NULL;
            RETURN 1;
        END

        -- Insert cylinder
        INSERT INTO cylinders (
            company_id, branch_id, cylinder_code, serial_number, barcode_number,
            cylinder_type, cylinder_family_code, gas_content, manufacture_no, challan_no,
            capacity, capacity_unit, manufacturer,
            manufacture_date, last_test_date, next_test_date,
            status, owner_type, owner_party_id, current_holder_party_id, ownership_remarks,
            is_active, created_by, created_at, updated_at
        )
        VALUES (
            @company_id, @branch_id, @cylinder_code, @serial_number, @barcode_number,
            @cylinder_type, @cylinder_family_code, @gas_content, @manufacture_no, @challan_no,
            @capacity, @capacity_unit, @manufacturer,
            @manufacture_date, @last_test_date, @next_test_date,
            ISNULL(@status, 'available'),
            @owner_type, @owner_party_id, @current_holder_party_id, @ownership_remarks,
            1, @created_by, GETDATE(), GETDATE()
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

-- ============================================
-- 2. GET CYLINDER BY ID
-- ============================================
IF OBJECT_ID('sp_GetCylinderById', 'P') IS NOT NULL DROP PROCEDURE sp_GetCylinderById;
GO

CREATE PROCEDURE sp_GetCylinderById
    @cylinder_id INT,
    @company_id INT,
    @branch_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.id,
        c.company_id,
        co.company_name,
        c.branch_id,
        b.branch_name,
        c.cylinder_code,
        c.serial_number,
        c.barcode_number,
        c.cylinder_type,
        c.cylinder_family_code,
        c.gas_content,
        c.manufacture_no,
        c.challan_no,
        c.capacity,
        c.capacity_unit,
        c.manufacturer,
        c.manufacture_date,
        c.last_test_date,
        c.next_test_date,
        c.status,
        c.owner_type,
        c.owner_party_id,
        c.current_holder_party_id,
        c.ownership_remarks,
        c.is_active,
        c.created_by,
        u.username as created_by_username,
        c.created_at,
        c.updated_at
    FROM cylinders c
    JOIN companies co ON c.company_id = co.id
    JOIN branches b ON c.branch_id = b.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = @cylinder_id 
        AND c.company_id = @company_id 
        AND c.branch_id = @branch_id;
END;
GO

-- ============================================
-- 3. GET CYLINDERS BY COMPANY-BRANCH (with pagination & filtering)
-- ============================================
IF OBJECT_ID('sp_GetCylindersByCompanyBranch', 'P') IS NOT NULL DROP PROCEDURE sp_GetCylindersByCompanyBranch;
GO

CREATE PROCEDURE sp_GetCylindersByCompanyBranch
    @company_id INT,
    @branch_id INT,
    @page_number INT = 1,
    @page_size INT = 10,
    @search_term NVARCHAR(255) = NULL,
    @status NVARCHAR(20) = NULL,
    @is_active BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@page_number - 1) * @page_size;

    SELECT 
        c.id,
        c.company_id,
        co.company_name,
        c.branch_id,
        b.branch_name,
        c.cylinder_code,
        c.serial_number,
        c.barcode_number,
        c.cylinder_type,
        c.cylinder_family_code,
        c.gas_content,
        c.manufacture_no,
        c.challan_no,
        c.capacity,
        c.capacity_unit,
        c.manufacturer,
        c.manufacture_date,
        c.last_test_date,
        c.next_test_date,
        c.status,
        c.owner_type,
        c.owner_party_id,
        c.current_holder_party_id,
        c.ownership_remarks,
        c.is_active,
        c.created_by,
        u.username as created_by_username,
        c.created_at,
        c.updated_at
    FROM cylinders c
    JOIN companies co ON c.company_id = co.id
    JOIN branches b ON c.branch_id = b.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.company_id = @company_id 
        AND c.branch_id = @branch_id
        AND (@search_term IS NULL OR 
             c.cylinder_code LIKE '%' + @search_term + '%' OR
             c.serial_number LIKE '%' + @search_term + '%' OR
             c.barcode_number LIKE '%' + @search_term + '%' OR
             c.cylinder_type LIKE '%' + @search_term + '%' OR
             c.manufacturer LIKE '%' + @search_term + '%')
        AND (@status IS NULL OR c.status = @status)
        AND (@is_active IS NULL OR c.is_active = @is_active)
    ORDER BY c.created_at DESC
    OFFSET @offset ROWS
    FETCH NEXT @page_size ROWS ONLY;
END;
GO

-- ============================================
-- 4. UPDATE CYLINDER
-- ============================================
IF OBJECT_ID('sp_UpdateCylinder', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateCylinder;
GO

CREATE PROCEDURE sp_UpdateCylinder
    @cylinder_id INT,
    @company_id INT,
    @branch_id INT,
    @cylinder_code NVARCHAR(50) = NULL,
    @serial_number NVARCHAR(100) = NULL,
    @barcode_number NVARCHAR(100) = NULL,
    @cylinder_type NVARCHAR(50) = NULL,
    @cylinder_family_code NVARCHAR(50) = NULL,
    @gas_content NVARCHAR(50) = NULL,
    @manufacture_no NVARCHAR(100) = NULL,
    @challan_no NVARCHAR(50) = NULL,
    @capacity DECIMAL(10,2) = NULL,
    @capacity_unit NVARCHAR(20) = NULL,
    @manufacturer NVARCHAR(100) = NULL,
    @manufacture_date DATE = NULL,
    @last_test_date DATE = NULL,
    @next_test_date DATE = NULL,
    @status NVARCHAR(20) = NULL,
    @owner_type NVARCHAR(10) = NULL,
    @owner_party_id INT = NULL,
    @current_holder_party_id INT = NULL,
    @ownership_remarks NVARCHAR(250) = NULL,
    @is_active BIT = NULL,
    @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @error_message = NULL;

    BEGIN TRY
        -- Check if cylinder exists
        IF NOT EXISTS (
            SELECT 1 FROM cylinders 
            WHERE id = @cylinder_id 
                AND company_id = @company_id 
                AND branch_id = @branch_id
        )
        BEGIN
            SET @error_message = 'Cylinder not found for this company and branch';
            RETURN 1;
        END

        -- Check for duplicate cylinder_code (if being updated)
        IF @cylinder_code IS NOT NULL AND EXISTS (
            SELECT 1 FROM cylinders 
            WHERE company_id = @company_id 
                AND branch_id = @branch_id 
                AND cylinder_code = @cylinder_code 
                AND id != @cylinder_id
        )
        BEGIN
            SET @error_message = 'Cylinder code already exists for this company and branch';
            RETURN 1;
        END

        -- Check for duplicate serial_number (if being updated)
        IF @serial_number IS NOT NULL AND EXISTS (
            SELECT 1 FROM cylinders 
            WHERE company_id = @company_id 
                AND branch_id = @branch_id 
                AND serial_number = @serial_number 
                AND id != @cylinder_id
        )
        BEGIN
            SET @error_message = 'Serial number already exists for this company and branch';
            RETURN 1;
        END

        -- Update cylinder (only update fields that are provided)
        UPDATE cylinders
        SET 
            cylinder_code = ISNULL(@cylinder_code, cylinder_code),
            serial_number = ISNULL(@serial_number, serial_number),
            barcode_number = CASE WHEN @barcode_number IS NOT NULL THEN @barcode_number ELSE barcode_number END,
            cylinder_type = CASE WHEN @cylinder_type IS NOT NULL THEN @cylinder_type ELSE cylinder_type END,
            cylinder_family_code = CASE WHEN @cylinder_family_code IS NOT NULL THEN @cylinder_family_code ELSE cylinder_family_code END,
            gas_content = CASE WHEN @gas_content IS NOT NULL THEN @gas_content ELSE gas_content END,
            manufacture_no = CASE WHEN @manufacture_no IS NOT NULL THEN @manufacture_no ELSE manufacture_no END,
            challan_no = CASE WHEN @challan_no IS NOT NULL THEN @challan_no ELSE challan_no END,
            capacity = CASE WHEN @capacity IS NOT NULL THEN @capacity ELSE capacity END,
            capacity_unit = CASE WHEN @capacity_unit IS NOT NULL THEN @capacity_unit ELSE capacity_unit END,
            manufacturer = CASE WHEN @manufacturer IS NOT NULL THEN @manufacturer ELSE manufacturer END,
            manufacture_date = CASE WHEN @manufacture_date IS NOT NULL THEN @manufacture_date ELSE manufacture_date END,
            last_test_date = CASE WHEN @last_test_date IS NOT NULL THEN @last_test_date ELSE last_test_date END,
            next_test_date = CASE WHEN @next_test_date IS NOT NULL THEN @next_test_date ELSE next_test_date END,
            status = ISNULL(@status, status),
            owner_type = ISNULL(@owner_type, owner_type),
            owner_party_id = CASE 
              WHEN @owner_type = 'SELF' THEN NULL
              WHEN @owner_party_id IS NOT NULL THEN @owner_party_id 
              ELSE owner_party_id 
            END,
            current_holder_party_id = CASE 
              WHEN @owner_type = 'SELF' THEN NULL
              WHEN @current_holder_party_id IS NOT NULL THEN @current_holder_party_id 
              ELSE current_holder_party_id 
            END,
            ownership_remarks = CASE WHEN @ownership_remarks IS NOT NULL THEN @ownership_remarks ELSE ownership_remarks END,
            is_active = ISNULL(@is_active, is_active),
            updated_at = GETDATE()
        WHERE id = @cylinder_id 
            AND company_id = @company_id 
            AND branch_id = @branch_id;

        SET @error_message = 'Cylinder updated successfully';
        RETURN 0;

    END TRY
    BEGIN CATCH
        SET @error_message = ERROR_MESSAGE();
        RETURN 1;
    END CATCH
END;
GO

-- ============================================
-- 5. DELETE CYLINDER (Soft Delete)
-- ============================================
IF OBJECT_ID('sp_DeleteCylinder', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteCylinder;
GO

CREATE PROCEDURE sp_DeleteCylinder
    @cylinder_id INT,
    @company_id INT,
    @branch_id INT,
    @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @error_message = NULL;

    BEGIN TRY
        -- Check if cylinder exists
        IF NOT EXISTS (
            SELECT 1 FROM cylinders 
            WHERE id = @cylinder_id 
                AND company_id = @company_id 
                AND branch_id = @branch_id
        )
        BEGIN
            SET @error_message = 'Cylinder not found for this company and branch';
            RETURN 1;
        END

        -- Soft delete (set is_active = 0)
        UPDATE cylinders
        SET is_active = 0,
            updated_at = GETDATE()
        WHERE id = @cylinder_id 
            AND company_id = @company_id 
            AND branch_id = @branch_id;

        SET @error_message = 'Cylinder deleted successfully';
        RETURN 0;

    END TRY
    BEGIN CATCH
        SET @error_message = ERROR_MESSAGE();
        RETURN 1;
    END CATCH
END;
GO

-- ============================================
-- 6. GET CYLINDER BY CODE
-- ============================================
IF OBJECT_ID('sp_GetCylinderByCode', 'P') IS NOT NULL DROP PROCEDURE sp_GetCylinderByCode;
GO

CREATE PROCEDURE sp_GetCylinderByCode
    @cylinder_code NVARCHAR(50),
    @company_id INT,
    @branch_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.id,
        c.company_id,
        co.company_name,
        c.branch_id,
        b.branch_name,
        c.cylinder_code,
        c.serial_number,
        c.barcode_number,
        c.cylinder_type,
        c.cylinder_family_code,
        c.gas_content,
        c.manufacture_no,
        c.challan_no,
        c.capacity,
        c.capacity_unit,
        c.manufacturer,
        c.manufacture_date,
        c.last_test_date,
        c.next_test_date,
        c.status,
        c.owner_type,
        c.owner_party_id,
        c.current_holder_party_id,
        c.ownership_remarks,
        c.is_active,
        c.created_by,
        u.username as created_by_username,
        c.created_at,
        c.updated_at
    FROM cylinders c
    JOIN companies co ON c.company_id = co.id
    JOIN branches b ON c.branch_id = b.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.cylinder_code = @cylinder_code 
        AND c.company_id = @company_id 
        AND c.branch_id = @branch_id;
END;
GO

-- ============================================
-- 7. GET CYLINDER BY SERIAL NUMBER
-- ============================================
IF OBJECT_ID('sp_GetCylinderBySerialNumber', 'P') IS NOT NULL DROP PROCEDURE sp_GetCylinderBySerialNumber;
GO

CREATE PROCEDURE sp_GetCylinderBySerialNumber
    @serial_number NVARCHAR(100),
    @company_id INT,
    @branch_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.id,
        c.company_id,
        co.company_name,
        c.branch_id,
        b.branch_name,
        c.cylinder_code,
        c.serial_number,
        c.barcode_number,
        c.cylinder_type,
        c.cylinder_family_code,
        c.gas_content,
        c.manufacture_no,
        c.challan_no,
        c.capacity,
        c.capacity_unit,
        c.manufacturer,
        c.manufacture_date,
        c.last_test_date,
        c.next_test_date,
        c.status,
        c.owner_type,
        c.owner_party_id,
        c.current_holder_party_id,
        c.ownership_remarks,
        c.is_active,
        c.created_by,
        u.username as created_by_username,
        c.created_at,
        c.updated_at
    FROM cylinders c
    JOIN companies co ON c.company_id = co.id
    JOIN branches b ON c.branch_id = b.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.serial_number = @serial_number 
        AND c.company_id = @company_id 
        AND c.branch_id = @branch_id;
END;
GO

-- ============================================
-- 8. GET CYLINDER COUNT BY STATUS
-- ============================================
IF OBJECT_ID('sp_GetCylinderCountByStatus', 'P') IS NOT NULL DROP PROCEDURE sp_GetCylinderCountByStatus;
GO

CREATE PROCEDURE sp_GetCylinderCountByStatus
    @company_id INT,
    @branch_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        status,
        COUNT(*) as count
    FROM cylinders
    WHERE company_id = @company_id 
        AND branch_id = @branch_id
        AND is_active = 1
    GROUP BY status;
END;
GO

-- ============================================
-- 9. GET CYLINDERS DUE FOR TEST
-- ============================================
IF OBJECT_ID('sp_GetCylindersDueForTest', 'P') IS NOT NULL DROP PROCEDURE sp_GetCylindersDueForTest;
GO

CREATE PROCEDURE sp_GetCylindersDueForTest
    @company_id INT,
    @branch_id INT,
    @days_ahead INT = 30  -- Check cylinders due in next 30 days
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.id,
        c.company_id,
        co.company_name,
        c.branch_id,
        b.branch_name,
        c.cylinder_code,
        c.serial_number,
        c.barcode_number,
        c.cylinder_type,
        c.capacity,
        c.capacity_unit,
        c.manufacturer,
        c.last_test_date,
        c.next_test_date,
        DATEDIFF(DAY, GETDATE(), c.next_test_date) as days_until_due,
        c.status,
        c.cylinder_family_code,
        c.gas_content,
        c.manufacture_no,
        c.challan_no,
        c.owner_type,
        c.owner_party_id,
        c.current_holder_party_id,
        c.ownership_remarks,
        c.is_active,
        c.created_at
    FROM cylinders c
    JOIN companies co ON c.company_id = co.id
    JOIN branches b ON c.branch_id = b.id
    WHERE c.company_id = @company_id 
        AND c.branch_id = @branch_id
        AND c.is_active = 1
        AND c.next_test_date IS NOT NULL
        AND c.next_test_date <= DATEADD(DAY, @days_ahead, GETDATE())
        AND c.next_test_date >= GETDATE()
    ORDER BY c.next_test_date ASC;
END;
GO

PRINT '✅ All Cylinder CRUD Stored Procedures created successfully!';
GO

