-- ============================================================
-- Party Master Stored Procedures (SQL Server) - cystra_db
-- Includes:
--  - sp_Party_List
--  - sp_Party_GetDetails
--  - sp_Party_Create
--  - sp_Party_Update
--  - sp_Party_Deactivate
--  - sp_Party_UpsertByCode (for CSV upload)
--  - sp_PartyAddress_UpsertByNaturalKey (for CSV upload)
--  - sp_PartyContact_UpsertByNaturalKey (for CSV upload)
-- ============================================================

USE cystra_db;
GO

-- Ensure commonly-used PartyMaster columns exist (older schema files may miss these)
IF COL_LENGTH('dbo.PartyMaster', 'PartyPhone') IS NULL
  ALTER TABLE dbo.PartyMaster ADD PartyPhone NVARCHAR(20) NULL;
GO
IF COL_LENGTH('dbo.PartyMaster', 'PartyEmail') IS NULL
  ALTER TABLE dbo.PartyMaster ADD PartyEmail NVARCHAR(150) NULL;
GO
IF COL_LENGTH('dbo.PartyMaster', 'ContactPerson') IS NULL
  ALTER TABLE dbo.PartyMaster ADD ContactPerson NVARCHAR(150) NULL;
GO

-- ============================================================
-- sp_Party_List (rows + total_count as 2nd recordset)
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Party_List')
  DROP PROCEDURE dbo.sp_Party_List;
GO
CREATE PROCEDURE dbo.sp_Party_List
  @CompanyID INT,
  @BranchID INT,
  @Search NVARCHAR(255) = NULL,
  @Page INT = 1,
  @Limit INT = 50
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Offset INT = (@Page - 1) * @Limit;
  DECLARE @Like NVARCHAR(255) = NULL;
  IF (@Search IS NOT NULL AND LTRIM(RTRIM(@Search)) <> '')
    SET @Like = '%' + @Search + '%';

  ;WITH base AS (
    SELECT
      pm.PartyID as party_id,
      pm.CompanyID as company_id,
      pm.BranchID as branch_id,
      pm.CustName as cust_name,
      pm.CustCode as cust_code,
      pm.PartyTypeID as party_type_id,
      pm.PartyCategoryID as party_category_id,
      pm.GSTNum as gst_num,
      pm.PANNo as pan_no,
      pm.CINNo as cin_no,
      pm.CompanyType as company_type,
      pm.MSMENo as msme_no,
      pm.MSMEType as msme_type,
      pm.UdyamNo as udyam_no,
      pm.IsActive as is_active,
      pm.PartyPhone as party_phone,
      pm.PartyEmail as party_email,
      pm.ContactPerson as contact_person,
      pm.CreatedOn as created_on,
      pm.ModifiedOn as modified_on,
      pm.CreatedBy as created_by,
      pm.ModifiedBy as modified_by,
      pt.TypeName as party_type,
      pcg.CategoryName as party_category,
      pc.Email as primary_email,
      COALESCE(pc.MobileNo, pc.PhoneNo) as primary_phone
    FROM dbo.PartyMaster pm
    LEFT JOIN dbo.PartyType pt ON pm.PartyTypeID = pt.PartyTypeID
    LEFT JOIN dbo.PartyCategory pcg ON pm.PartyCategoryID = pcg.PartyCategoryID
    OUTER APPLY (
      SELECT TOP 1 Email, MobileNo, PhoneNo
      FROM dbo.PartyContact
      WHERE PartyID = pm.PartyID AND IsActive = 1 AND IsPrimary = 1
      ORDER BY ContactID ASC
    ) pc
    WHERE pm.CompanyID = @CompanyID
      AND pm.BranchID = @BranchID
      AND pm.IsActive = 1
      AND (
        @Like IS NULL OR
        pm.CustName LIKE @Like OR
        pm.CustCode LIKE @Like OR
        ISNULL(pm.GSTNum, '') LIKE @Like OR
        ISNULL(pm.PartyEmail, '') LIKE @Like OR
        ISNULL(pm.PartyPhone, '') LIKE @Like OR
        ISNULL(pm.ContactPerson, '') LIKE @Like OR
        ISNULL(pc.Email, '') LIKE @Like OR
        ISNULL(pc.MobileNo, '') LIKE @Like OR
        ISNULL(pc.PhoneNo, '') LIKE @Like
      )
  )
  SELECT *
  FROM base
  ORDER BY cust_name ASC
  OFFSET @Offset ROWS
  FETCH NEXT @Limit ROWS ONLY;

  SELECT COUNT(1) AS total_count
  FROM dbo.PartyMaster pm
  OUTER APPLY (
    SELECT TOP 1 Email, MobileNo, PhoneNo
    FROM dbo.PartyContact
    WHERE PartyID = pm.PartyID AND IsActive = 1 AND IsPrimary = 1
    ORDER BY ContactID ASC
  ) pc
  WHERE pm.CompanyID = @CompanyID
    AND pm.BranchID = @BranchID
    AND pm.IsActive = 1
    AND (
      @Like IS NULL OR
      pm.CustName LIKE @Like OR
      pm.CustCode LIKE @Like OR
      ISNULL(pm.GSTNum, '') LIKE @Like OR
      ISNULL(pm.PartyEmail, '') LIKE @Like OR
      ISNULL(pm.PartyPhone, '') LIKE @Like OR
      ISNULL(pm.ContactPerson, '') LIKE @Like OR
      ISNULL(pc.Email, '') LIKE @Like OR
      ISNULL(pc.MobileNo, '') LIKE @Like OR
      ISNULL(pc.PhoneNo, '') LIKE @Like
    );
END
GO

-- ============================================================
-- sp_Party_GetDetails (3 recordsets: party, addresses, contacts)
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Party_GetDetails')
  DROP PROCEDURE dbo.sp_Party_GetDetails;
GO
CREATE PROCEDURE dbo.sp_Party_GetDetails
  @CompanyID INT,
  @BranchID INT,
  @PartyID INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    pm.PartyID as party_id,
    pm.CompanyID as company_id,
    pm.BranchID as branch_id,
    pm.CustCode as cust_code,
    pm.CustName as cust_name,
    pm.PartyTypeID as party_type_id,
    pm.PartyCategoryID as party_category_id,
    pm.GSTNum as gst_num,
    pm.PANNo as pan_no,
    pm.CINNo as cin_no,
    pm.CompanyType as company_type,
    pm.MSMENo as msme_no,
    pm.MSMEType as msme_type,
    pm.UdyamNo as udyam_no,
    pm.IsActive as is_active,
    pm.PartyPhone as party_phone,
    pm.PartyEmail as party_email,
    pm.ContactPerson as contact_person,
    pm.CreatedOn as created_on,
    pm.ModifiedOn as modified_on,
    pm.CreatedBy as created_by,
    pm.ModifiedBy as modified_by
  FROM dbo.PartyMaster pm
  WHERE pm.PartyID = @PartyID
    AND pm.CompanyID = @CompanyID
    AND pm.BranchID = @BranchID
    AND pm.IsActive = 1;

  SELECT
    AddressID as address_id,
    PartyID as party_id,
    AddressType as address_type,
    Address1 as address1,
    Address2 as address2,
    Address3 as address3,
    CityID as city_id,
    StateID as state_id,
    CountryID as country_id,
    PinCode as pincode,
    IsDefault as is_default,
    IsActive as is_active
  FROM dbo.PartyAddress
  WHERE PartyID = @PartyID AND IsActive = 1
  ORDER BY IsDefault DESC, AddressID ASC;

  SELECT
    ContactID as contact_id,
    PartyID as party_id,
    FirstName as first_name,
    LastName as last_name,
    ContactPerson as contact_person,
    Email as email,
    MobileNo as mobile_no,
    PhoneNo as phone_no,
    IsPrimary as is_primary,
    IsActive as is_active
  FROM dbo.PartyContact
  WHERE PartyID = @PartyID AND IsActive = 1
  ORDER BY IsPrimary DESC, ContactID ASC;
END
GO

-- ============================================================
-- sp_Party_Create (insert only)
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Party_Create')
  DROP PROCEDURE dbo.sp_Party_Create;
GO
CREATE PROCEDURE dbo.sp_Party_Create
  @CompanyID INT,
  @BranchID INT,
  @CustCode NVARCHAR(20),
  @CustName NVARCHAR(200),
  @PartyTypeID INT = NULL,
  @PartyCategoryID INT = NULL,
  @GSTNum NVARCHAR(25) = NULL,
  @PANNo NVARCHAR(15) = NULL,
  @CINNo NVARCHAR(25) = NULL,
  @CompanyType NVARCHAR(50) = NULL,
  @MSMENo NVARCHAR(30) = NULL,
  @MSMEType NVARCHAR(50) = NULL,
  @UdyamNo NVARCHAR(30) = NULL,
  @PartyPhone NVARCHAR(20) = NULL,
  @PartyEmail NVARCHAR(150) = NULL,
  @ContactPerson NVARCHAR(150) = NULL,
  @CreatedBy NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1 FROM dbo.PartyMaster
    WHERE CompanyID=@CompanyID AND BranchID=@BranchID AND CustCode=@CustCode
  )
  BEGIN
    RAISERROR('PartyCode already exists for this company/branch', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.PartyMaster (
    CompanyID, BranchID, CustCode, CustName,
    PartyTypeID, PartyCategoryID,
    GSTNum, PANNo, CINNo,
    CompanyType, MSMENo, MSMEType, UdyamNo,
    PartyPhone, PartyEmail, ContactPerson,
    IsActive, CreatedOn, CreatedBy
  )
  VALUES (
    @CompanyID, @BranchID, @CustCode, @CustName,
    @PartyTypeID, @PartyCategoryID,
    @GSTNum, @PANNo, @CINNo,
    @CompanyType, @MSMENo, @MSMEType, @UdyamNo,
    @PartyPhone, @PartyEmail, @ContactPerson,
    1, GETDATE(), @CreatedBy
  );

  SELECT SCOPE_IDENTITY() AS party_id;
END
GO

-- ============================================================
-- sp_Party_Update (update by PartyID + scope)
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Party_Update')
  DROP PROCEDURE dbo.sp_Party_Update;
GO
CREATE PROCEDURE dbo.sp_Party_Update
  @CompanyID INT,
  @BranchID INT,
  @PartyID INT,
  @CustCode NVARCHAR(20) = NULL,
  @CustName NVARCHAR(200) = NULL,
  @PartyTypeID INT = NULL,
  @PartyCategoryID INT = NULL,
  @GSTNum NVARCHAR(25) = NULL,
  @PANNo NVARCHAR(15) = NULL,
  @CINNo NVARCHAR(25) = NULL,
  @CompanyType NVARCHAR(50) = NULL,
  @MSMENo NVARCHAR(30) = NULL,
  @MSMEType NVARCHAR(50) = NULL,
  @UdyamNo NVARCHAR(30) = NULL,
  @PartyPhone NVARCHAR(20) = NULL,
  @PartyEmail NVARCHAR(150) = NULL,
  @ContactPerson NVARCHAR(150) = NULL,
  @IsActive BIT = NULL,
  @ModifiedBy NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.PartyMaster
    WHERE PartyID=@PartyID AND CompanyID=@CompanyID AND BranchID=@BranchID AND IsActive=1
  )
  BEGIN
    RAISERROR('Party not found', 16, 1);
    RETURN;
  END

  -- Prevent changing code to a duplicate in same scope
  IF (@CustCode IS NOT NULL AND EXISTS (
    SELECT 1 FROM dbo.PartyMaster
    WHERE CompanyID=@CompanyID AND BranchID=@BranchID AND CustCode=@CustCode AND PartyID<>@PartyID
  ))
  BEGIN
    RAISERROR('PartyCode already exists for this company/branch', 16, 1);
    RETURN;
  END

  UPDATE dbo.PartyMaster
  SET
    CustCode = COALESCE(@CustCode, CustCode),
    CustName = COALESCE(@CustName, CustName),
    PartyTypeID = COALESCE(@PartyTypeID, PartyTypeID),
    PartyCategoryID = COALESCE(@PartyCategoryID, PartyCategoryID),
    GSTNum = COALESCE(@GSTNum, GSTNum),
    PANNo = COALESCE(@PANNo, PANNo),
    CINNo = COALESCE(@CINNo, CINNo),
    CompanyType = COALESCE(@CompanyType, CompanyType),
    MSMENo = COALESCE(@MSMENo, MSMENo),
    MSMEType = COALESCE(@MSMEType, MSMEType),
    UdyamNo = COALESCE(@UdyamNo, UdyamNo),
    PartyPhone = COALESCE(@PartyPhone, PartyPhone),
    PartyEmail = COALESCE(@PartyEmail, PartyEmail),
    ContactPerson = COALESCE(@ContactPerson, ContactPerson),
    IsActive = COALESCE(@IsActive, IsActive),
    ModifiedOn = GETDATE(),
    ModifiedBy = COALESCE(@ModifiedBy, ModifiedBy)
  WHERE PartyID=@PartyID AND CompanyID=@CompanyID AND BranchID=@BranchID;
END
GO

-- ============================================================
-- sp_Party_Deactivate (soft delete)
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Party_Deactivate')
  DROP PROCEDURE dbo.sp_Party_Deactivate;
GO
CREATE PROCEDURE dbo.sp_Party_Deactivate
  @CompanyID INT,
  @BranchID INT,
  @PartyID INT,
  @ModifiedBy NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.PartyMaster
    WHERE PartyID=@PartyID AND CompanyID=@CompanyID AND BranchID=@BranchID AND IsActive=1
  )
  BEGIN
    RAISERROR('Party not found', 16, 1);
    RETURN;
  END

  UPDATE dbo.PartyMaster
  SET IsActive=0, ModifiedOn=GETDATE(), ModifiedBy=COALESCE(@ModifiedBy, ModifiedBy)
  WHERE PartyID=@PartyID AND CompanyID=@CompanyID AND BranchID=@BranchID;
END
GO

-- ============================================================
-- sp_Party_UpsertByCode (industry standard for CSV upload)
-- Key = CompanyID + BranchID + CustCode
-- If exists => update fields (treat provided NULLs as clearing fields)
-- Returns party_id and action
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Party_UpsertByCode')
  DROP PROCEDURE dbo.sp_Party_UpsertByCode;
GO
CREATE PROCEDURE dbo.sp_Party_UpsertByCode
  @CompanyID INT,
  @BranchID INT,
  @CustCode NVARCHAR(20),
  @CustName NVARCHAR(200),
  @PartyTypeID INT = NULL,
  @PartyCategoryID INT = NULL,
  @GSTNum NVARCHAR(25) = NULL,
  @PANNo NVARCHAR(15) = NULL,
  @CINNo NVARCHAR(25) = NULL,
  @CompanyType NVARCHAR(50) = NULL,
  @MSMENo NVARCHAR(30) = NULL,
  @MSMEType NVARCHAR(50) = NULL,
  @UdyamNo NVARCHAR(30) = NULL,
  @PartyPhone NVARCHAR(20) = NULL,
  @PartyEmail NVARCHAR(150) = NULL,
  @ContactPerson NVARCHAR(150) = NULL,
  @IsActive BIT = 1,
  @User NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @PartyID INT = NULL;

  SELECT TOP 1 @PartyID = PartyID
  FROM dbo.PartyMaster
  WHERE CompanyID=@CompanyID AND BranchID=@BranchID AND CustCode=@CustCode;

  IF (@PartyID IS NULL)
  BEGIN
    INSERT INTO dbo.PartyMaster (
      CompanyID, BranchID, CustCode, CustName,
      PartyTypeID, PartyCategoryID,
      GSTNum, PANNo, CINNo,
      CompanyType, MSMENo, MSMEType, UdyamNo,
      PartyPhone, PartyEmail, ContactPerson,
      IsActive, CreatedOn, CreatedBy
    )
    VALUES (
      @CompanyID, @BranchID, @CustCode, @CustName,
      @PartyTypeID, @PartyCategoryID,
      @GSTNum, @PANNo, @CINNo,
      @CompanyType, @MSMENo, @MSMEType, @UdyamNo,
      @PartyPhone, @PartyEmail, @ContactPerson,
      COALESCE(@IsActive, 1), GETDATE(), @User
    );
    SET @PartyID = SCOPE_IDENTITY();
    SELECT @PartyID AS party_id, 'INSERT' AS action;
    RETURN;
  END

  UPDATE dbo.PartyMaster
  SET
    CustName = COALESCE(@CustName, CustName),
    PartyTypeID = COALESCE(@PartyTypeID, PartyTypeID),
    PartyCategoryID = COALESCE(@PartyCategoryID, PartyCategoryID),
    GSTNum = COALESCE(@GSTNum, GSTNum),
    PANNo = COALESCE(@PANNo, PANNo),
    CINNo = COALESCE(@CINNo, CINNo),
    CompanyType = COALESCE(@CompanyType, CompanyType),
    MSMENo = COALESCE(@MSMENo, MSMENo),
    MSMEType = COALESCE(@MSMEType, MSMEType),
    UdyamNo = COALESCE(@UdyamNo, UdyamNo),
    PartyPhone = COALESCE(@PartyPhone, PartyPhone),
    PartyEmail = COALESCE(@PartyEmail, PartyEmail),
    ContactPerson = COALESCE(@ContactPerson, ContactPerson),
    IsActive = COALESCE(@IsActive, IsActive),
    ModifiedOn = GETDATE(),
    ModifiedBy = @User
  WHERE PartyID=@PartyID AND CompanyID=@CompanyID AND BranchID=@BranchID;

  SELECT @PartyID AS party_id, 'UPDATE' AS action;
END
GO

-- ============================================================
-- sp_PartyAddress_UpsertByNaturalKey
-- Natural key: PartyID + AddressType + Address1 + PinCode
-- If IsDefault=1 => clears other defaults for same PartyID+AddressType
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_PartyAddress_UpsertByNaturalKey')
  DROP PROCEDURE dbo.sp_PartyAddress_UpsertByNaturalKey;
GO
CREATE PROCEDURE dbo.sp_PartyAddress_UpsertByNaturalKey
  @PartyID INT,
  @AddressType NVARCHAR(20),
  @Address1 NVARCHAR(200),
  @Address2 NVARCHAR(200) = NULL,
  @Address3 NVARCHAR(200) = NULL,
  @CityID INT = NULL,
  @StateID INT = NULL,
  @CountryID INT = NULL,
  @PinCode NVARCHAR(10) = NULL,
  @IsDefault BIT = 0,
  @IsActive BIT = 1
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @AddressID INT = NULL;

  SELECT TOP 1 @AddressID = AddressID
  FROM dbo.PartyAddress
  WHERE PartyID=@PartyID
    AND AddressType=@AddressType
    AND Address1=@Address1
    AND ISNULL(PinCode,'') = ISNULL(@PinCode,'');

  IF (@AddressID IS NULL)
  BEGIN
    INSERT INTO dbo.PartyAddress (
      PartyID, AddressType, Address1, Address2, Address3,
      CityID, StateID, CountryID, PinCode,
      IsDefault, IsActive
    )
    VALUES (
      @PartyID, @AddressType, @Address1, @Address2, @Address3,
      @CityID, @StateID, @CountryID, @PinCode,
      COALESCE(@IsDefault, 0), COALESCE(@IsActive, 1)
    );
    SET @AddressID = SCOPE_IDENTITY();
  END
  ELSE
  BEGIN
    UPDATE dbo.PartyAddress
    SET
      Address2=COALESCE(@Address2, Address2),
      Address3=COALESCE(@Address3, Address3),
      CityID=COALESCE(@CityID, CityID),
      StateID=COALESCE(@StateID, StateID),
      CountryID=COALESCE(@CountryID, CountryID),
      IsDefault=COALESCE(@IsDefault, IsDefault),
      IsActive=COALESCE(@IsActive, IsActive)
    WHERE AddressID=@AddressID AND PartyID=@PartyID;
  END

  IF (COALESCE(@IsDefault, 0) = 1)
  BEGIN
    UPDATE dbo.PartyAddress
    SET IsDefault = 0
    WHERE PartyID=@PartyID
      AND AddressType=@AddressType
      AND AddressID<>@AddressID
      AND IsActive=1;
  END

  SELECT @AddressID AS address_id;
END
GO

-- ============================================================
-- sp_PartyContact_UpsertByNaturalKey
-- Natural key preference:
--   - if Email provided => PartyID + Email
--   - else if MobileNo provided => PartyID + MobileNo
-- If IsPrimary=1 => clears other primaries for PartyID
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_PartyContact_UpsertByNaturalKey')
  DROP PROCEDURE dbo.sp_PartyContact_UpsertByNaturalKey;
GO
CREATE PROCEDURE dbo.sp_PartyContact_UpsertByNaturalKey
  @PartyID INT,
  @FirstName NVARCHAR(100),
  @LastName NVARCHAR(100) = NULL,
  @ContactPerson NVARCHAR(150) = NULL,
  @Email NVARCHAR(150) = NULL,
  @MobileNo NVARCHAR(15) = NULL,
  @PhoneNo NVARCHAR(20) = NULL,
  @IsPrimary BIT = 0,
  @IsActive BIT = 1
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @ContactID INT = NULL;

  IF (@Email IS NOT NULL AND LTRIM(RTRIM(@Email)) <> '')
  BEGIN
    SELECT TOP 1 @ContactID = ContactID
    FROM dbo.PartyContact
    WHERE PartyID=@PartyID AND Email=@Email;
  END
  ELSE IF (@MobileNo IS NOT NULL AND LTRIM(RTRIM(@MobileNo)) <> '')
  BEGIN
    SELECT TOP 1 @ContactID = ContactID
    FROM dbo.PartyContact
    WHERE PartyID=@PartyID AND MobileNo=@MobileNo;
  END

  IF (@ContactID IS NULL)
  BEGIN
    INSERT INTO dbo.PartyContact (
      PartyID, FirstName, LastName, ContactPerson,
      Email, MobileNo, PhoneNo, IsPrimary, IsActive
    )
    VALUES (
      @PartyID, @FirstName, @LastName, @ContactPerson,
      @Email, @MobileNo, @PhoneNo, COALESCE(@IsPrimary,0), COALESCE(@IsActive,1)
    );
    SET @ContactID = SCOPE_IDENTITY();
  END
  ELSE
  BEGIN
    UPDATE dbo.PartyContact
    SET
      FirstName=COALESCE(@FirstName, FirstName),
      LastName=COALESCE(@LastName, LastName),
      ContactPerson=COALESCE(@ContactPerson, ContactPerson),
      PhoneNo=COALESCE(@PhoneNo, PhoneNo),
      IsPrimary=COALESCE(@IsPrimary, IsPrimary),
      IsActive=COALESCE(@IsActive, IsActive)
    WHERE ContactID=@ContactID AND PartyID=@PartyID;
  END

  IF (COALESCE(@IsPrimary, 0) = 1)
  BEGIN
    UPDATE dbo.PartyContact
    SET IsPrimary = 0
    WHERE PartyID=@PartyID
      AND ContactID<>@ContactID
      AND IsActive=1;
  END

  SELECT @ContactID AS contact_id;
END
GO

