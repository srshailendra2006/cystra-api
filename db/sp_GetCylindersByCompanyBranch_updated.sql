-- Drop existing procedure if exists
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetCylindersByCompanyBranch')
    DROP PROCEDURE [dbo].[sp_GetCylindersByCompanyBranch];
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_GetCylindersByCompanyBranch]
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
    DECLARE @total_count INT;

    -- First, get the total count (without pagination)
    SELECT @total_count = COUNT(*)
    FROM cylinders c
    WHERE c.company_id = @company_id 
        AND c.branch_id = @branch_id
        AND (@search_term IS NULL OR 
             c.cylinder_code LIKE '%' + @search_term + '%' OR
             c.serial_number LIKE '%' + @search_term + '%' OR
             c.barcode_number LIKE '%' + @search_term + '%' OR
             c.cylinder_type LIKE '%' + @search_term + '%' OR
             c.manufacturer LIKE '%' + @search_term + '%')
        AND (@status IS NULL OR c.status = @status)
        AND (@is_active IS NULL OR c.is_active = @is_active);

    -- Result Set 1: Paginated cylinder data
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

    -- Result Set 2: Total count for pagination
    SELECT @total_count AS total_count;
END;
GO
