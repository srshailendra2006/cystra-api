-- ============================================================
-- Party Master (SQL Server) - Company + Branch scoped
-- Schema aligned with UI: PartyMaster + PartyAddress + PartyContact + PartyType + PartyCategory
-- Database: cystra_db
-- ============================================================

USE cystra_db;
GO

-- =========================
-- Lookup: PartyType
-- =========================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PartyType')
BEGIN
  CREATE TABLE dbo.PartyType (
    PartyTypeID INT IDENTITY(1,1) PRIMARY KEY,
    TypeCode    NVARCHAR(20) NOT NULL,
    TypeName    NVARCHAR(50) NOT NULL,
    IsActive    BIT NOT NULL DEFAULT 1
  );

  CREATE UNIQUE INDEX UX_PartyType_TypeCode ON dbo.PartyType(TypeCode);
  CREATE UNIQUE INDEX UX_PartyType_TypeName ON dbo.PartyType(TypeName);
END
GO

-- =========================
-- Lookup: PartyCategory
-- =========================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PartyCategory')
BEGIN
  CREATE TABLE dbo.PartyCategory (
    PartyCategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryCode    NVARCHAR(20) NOT NULL,
    CategoryName    NVARCHAR(50) NOT NULL,
    IsActive        BIT NOT NULL DEFAULT 1
  );

  CREATE UNIQUE INDEX UX_PartyCategory_CategoryCode ON dbo.PartyCategory(CategoryCode);
  CREATE UNIQUE INDEX UX_PartyCategory_CategoryName ON dbo.PartyCategory(CategoryName);
END
GO

-- =========================
-- Master: PartyMaster
-- =========================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PartyMaster')
BEGIN
  CREATE TABLE dbo.PartyMaster (
    PartyID         INT IDENTITY(1,1) PRIMARY KEY,
    CompanyID       INT NOT NULL,
    BranchID        INT NOT NULL,
    CustCode        NVARCHAR(20) NOT NULL,
    CustName        NVARCHAR(200) NOT NULL,
    PartyTypeID     INT NULL,
    PartyCategoryID INT NULL,
    GSTNum          NVARCHAR(25) NULL,
    PANNo           NVARCHAR(15) NULL,
    CINNo           NVARCHAR(25) NULL,
    CompanyType     NVARCHAR(50) NULL,
    MSMENo          NVARCHAR(30) NULL,
    MSMEType        NVARCHAR(50) NULL,
    UdyamNo         NVARCHAR(30) NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedOn       DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedOn      DATETIME NULL,
    CreatedBy       NVARCHAR(50) NULL,
    ModifiedBy      NVARCHAR(50) NULL
  );

  ALTER TABLE dbo.PartyMaster
    ADD CONSTRAINT UQ_Party_Company_Branch_Code UNIQUE (CompanyID, BranchID, CustCode);

  -- Optional business rule (enable only if you truly need name uniqueness)
  -- ALTER TABLE dbo.PartyMaster
  --   ADD CONSTRAINT UQ_Party_Company_Branch_Name UNIQUE (CompanyID, BranchID, CustName);

  ALTER TABLE dbo.PartyMaster
    ADD CONSTRAINT FK_PartyMaster_PartyType FOREIGN KEY (PartyTypeID) REFERENCES dbo.PartyType(PartyTypeID);

  ALTER TABLE dbo.PartyMaster
    ADD CONSTRAINT FK_PartyMaster_PartyCategory FOREIGN KEY (PartyCategoryID) REFERENCES dbo.PartyCategory(PartyCategoryID);

  CREATE INDEX IX_PartyMaster_CompanyBranchActiveName ON dbo.PartyMaster(CompanyID, BranchID, IsActive, CustName);
END
GO

-- =========================
-- Child: PartyAddress
-- =========================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PartyAddress')
BEGIN
  CREATE TABLE dbo.PartyAddress (
    AddressID   INT IDENTITY(1,1) PRIMARY KEY,
    PartyID     INT NOT NULL,
    AddressType NVARCHAR(20) NOT NULL, -- Billing / Shipping / Registered
    Address1    NVARCHAR(200) NOT NULL,
    Address2    NVARCHAR(200) NULL,
    Address3    NVARCHAR(200) NULL,
    CityID      INT NULL,
    StateID     INT NULL,
    CountryID   INT NULL,
    PinCode     NVARCHAR(10) NULL,
    IsDefault   BIT NOT NULL DEFAULT 0,
    IsActive    BIT NOT NULL DEFAULT 1
  );

  ALTER TABLE dbo.PartyAddress
    ADD CONSTRAINT FK_PartyAddress_Party FOREIGN KEY (PartyID) REFERENCES dbo.PartyMaster(PartyID);

  CREATE INDEX IX_PartyAddress_PartyActive ON dbo.PartyAddress(PartyID, IsActive);
  CREATE INDEX IX_PartyAddress_PartyDefault ON dbo.PartyAddress(PartyID, AddressType, IsDefault);
END
GO

-- =========================
-- Child: PartyContact
-- =========================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PartyContact')
BEGIN
  CREATE TABLE dbo.PartyContact (
    ContactID     INT IDENTITY(1,1) PRIMARY KEY,
    PartyID       INT NOT NULL,
    FirstName     NVARCHAR(100) NOT NULL,
    LastName      NVARCHAR(100) NULL,
    ContactPerson NVARCHAR(150) NULL,
    Email         NVARCHAR(150) NULL,
    MobileNo      NVARCHAR(15) NULL,
    PhoneNo       NVARCHAR(20) NULL,
    IsPrimary     BIT NOT NULL DEFAULT 0,
    IsActive      BIT NOT NULL DEFAULT 1
  );

  ALTER TABLE dbo.PartyContact
    ADD CONSTRAINT FK_PartyContact_Party FOREIGN KEY (PartyID) REFERENCES dbo.PartyMaster(PartyID);

  CREATE INDEX IX_PartyContact_PartyActive ON dbo.PartyContact(PartyID, IsActive);
  CREATE INDEX IX_PartyContact_PartyPrimary ON dbo.PartyContact(PartyID, IsPrimary);
END
GO


