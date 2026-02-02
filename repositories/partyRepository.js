const { sql, getPool } = require('../db');

class PartyRepository {
  async listParties({ company_id, branch_id, search = null, page = 1, limit = 50 }) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('CompanyID', sql.Int, company_id)
        .input('BranchID', sql.Int, branch_id)
        .input('Search', sql.NVarChar(255), search || null)
        .input('Page', sql.Int, page)
        .input('Limit', sql.Int, limit)
        .execute('dbo.sp_Party_List');

      const rows = result.recordsets?.[0] || [];
      const totalCount = result.recordsets?.[1]?.[0]?.total_count || 0;

      return {
        data: rows,
        totalCount
      };
    } catch (err) {
      throw new Error(`Error listing parties: ${err.message}`);
    }
  }

  async getPartyDetails({ company_id, branch_id, party_id }) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('CompanyID', sql.Int, company_id)
        .input('BranchID', sql.Int, branch_id)
        .input('PartyID', sql.Int, party_id)
        .execute('dbo.sp_Party_GetDetails');

      const party = result.recordsets?.[0]?.[0] || null;
      if (!party) {
        const error = new Error('Party not found');
        error.status = 404;
        throw error;
      }

      return {
        party,
        addresses: result.recordsets?.[1] || [],
        contacts: result.recordsets?.[2] || []
      };
    } catch (err) {
      throw err;
    }
  }

  async createPartyFull({ company_id, branch_id, created_by, party, addresses = [], contacts = [] }) {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const created = await new sql.Request(tx)
        .input('CompanyID', sql.Int, company_id)
        .input('BranchID', sql.Int, branch_id)
        .input('CustCode', sql.NVarChar(20), party.cust_code)
        .input('CustName', sql.NVarChar(200), party.cust_name)
        .input('PartyTypeID', sql.Int, party.party_type_id ?? null)
        .input('PartyCategoryID', sql.Int, party.party_category_id ?? null)
        .input('GSTNum', sql.NVarChar(25), party.gst_num ?? null)
        .input('PANNo', sql.NVarChar(15), party.pan_no ?? null)
        .input('CINNo', sql.NVarChar(25), party.cin_no ?? null)
        .input('CompanyType', sql.NVarChar(50), party.company_type ?? null)
        .input('MSMENo', sql.NVarChar(30), party.msme_no ?? null)
        .input('MSMEType', sql.NVarChar(50), party.msme_type ?? null)
        .input('UdyamNo', sql.NVarChar(30), party.udyam_no ?? null)
        .input('PartyPhone', sql.NVarChar(20), party.party_phone ?? null)
        .input('PartyEmail', sql.NVarChar(150), party.party_email ?? null)
        .input('ContactPerson', sql.NVarChar(150), party.contact_person ?? null)
        .input('CreatedBy', sql.NVarChar(50), created_by ?? null)
        .execute('dbo.sp_Party_Create');

      const party_id = created.recordset?.[0]?.party_id;
      if (!party_id) throw new Error('Failed to create party');

      // Addresses (Option B: only insert what is provided)
      for (const a of addresses || []) {
        await new sql.Request(tx)
          .input('PartyID', sql.Int, party_id)
          .input('AddressType', sql.NVarChar(20), a.address_type)
          .input('Address1', sql.NVarChar(200), a.address1)
          .input('Address2', sql.NVarChar(200), a.address2 ?? null)
          .input('Address3', sql.NVarChar(200), a.address3 ?? null)
          .input('CityID', sql.Int, a.city_id ?? null)
          .input('StateID', sql.Int, a.state_id ?? null)
          .input('CountryID', sql.Int, a.country_id ?? null)
          .input('PinCode', sql.NVarChar(10), a.pincode ?? null)
          .input('IsDefault', sql.Bit, a.is_default ? 1 : 0)
          .input('IsActive', sql.Bit, a.is_active === false ? 0 : 1)
          .query(`
            INSERT INTO dbo.PartyAddress (
              PartyID, AddressType, Address1, Address2, Address3,
              CityID, StateID, CountryID, PinCode,
              IsDefault, IsActive
            )
            VALUES (
              @PartyID, @AddressType, @Address1, @Address2, @Address3,
              @CityID, @StateID, @CountryID, @PinCode,
              @IsDefault, @IsActive
            );
          `);
      }

      // Contacts (ensure single primary)
      let primarySeen = false;
      for (const c of contacts || []) {
        const isPrimary = !!c.is_primary && !primarySeen;
        if (isPrimary) primarySeen = true;

        await new sql.Request(tx)
          .input('PartyID', sql.Int, party_id)
          .input('FirstName', sql.NVarChar(100), c.first_name)
          .input('LastName', sql.NVarChar(100), c.last_name ?? null)
          .input('ContactPerson', sql.NVarChar(150), c.contact_person ?? null)
          .input('Email', sql.NVarChar(150), c.email ?? null)
          .input('MobileNo', sql.NVarChar(15), c.mobile_no ?? null)
          .input('PhoneNo', sql.NVarChar(20), c.phone_no ?? null)
          .input('IsPrimary', sql.Bit, isPrimary ? 1 : 0)
          .input('IsActive', sql.Bit, c.is_active === false ? 0 : 1)
          .query(`
            INSERT INTO dbo.PartyContact (
              PartyID, FirstName, LastName, ContactPerson,
              Email, MobileNo, PhoneNo, IsPrimary, IsActive
            )
            VALUES (
              @PartyID, @FirstName, @LastName, @ContactPerson,
              @Email, @MobileNo, @PhoneNo, @IsPrimary, @IsActive
            );
          `);
      }

      // If a default address is set, unset others for that PartyID + AddressType
      await new sql.Request(tx).input('PartyID', sql.Int, party_id).query(`
        UPDATE pa
        SET IsDefault = 0
        FROM dbo.PartyAddress pa
        INNER JOIN (
          SELECT PartyID, AddressType, MIN(AddressID) AS KeepId
          FROM dbo.PartyAddress
          WHERE PartyID = @PartyID AND IsActive = 1 AND IsDefault = 1
          GROUP BY PartyID, AddressType
        ) x ON pa.PartyID = x.PartyID AND pa.AddressType = x.AddressType
        WHERE pa.PartyID = @PartyID AND pa.AddressType = x.AddressType
          AND pa.AddressID <> x.KeepId AND pa.IsActive = 1;
      `);

      // If multiple primary contacts, keep the first
      await new sql.Request(tx).input('PartyID', sql.Int, party_id).query(`
        WITH prim AS (
          SELECT ContactID, ROW_NUMBER() OVER (ORDER BY ContactID) AS rn
          FROM dbo.PartyContact
          WHERE PartyID = @PartyID AND IsActive = 1 AND IsPrimary = 1
        )
        UPDATE dbo.PartyContact
        SET IsPrimary = 0
        WHERE PartyID = @PartyID AND ContactID IN (SELECT ContactID FROM prim WHERE rn > 1);
      `);

      await tx.commit();
      return { party_id };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async updatePartyFull({ company_id, branch_id, party_id, modified_by, party, addresses = [], contacts = [] }) {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // Update master (only fields provided)
      await new sql.Request(tx)
        .input('CompanyID', sql.Int, company_id)
        .input('BranchID', sql.Int, branch_id)
        .input('PartyID', sql.Int, party_id)
        .input('CustCode', sql.NVarChar(20), party.cust_code ?? null)
        .input('CustName', sql.NVarChar(200), party.cust_name ?? null)
        .input('PartyTypeID', sql.Int, party.party_type_id ?? null)
        .input('PartyCategoryID', sql.Int, party.party_category_id ?? null)
        .input('GSTNum', sql.NVarChar(25), party.gst_num ?? null)
        .input('PANNo', sql.NVarChar(15), party.pan_no ?? null)
        .input('CINNo', sql.NVarChar(25), party.cin_no ?? null)
        .input('CompanyType', sql.NVarChar(50), party.company_type ?? null)
        .input('MSMENo', sql.NVarChar(30), party.msme_no ?? null)
        .input('MSMEType', sql.NVarChar(50), party.msme_type ?? null)
        .input('UdyamNo', sql.NVarChar(30), party.udyam_no ?? null)
        .input('PartyPhone', sql.NVarChar(20), party.party_phone ?? null)
        .input('PartyEmail', sql.NVarChar(150), party.party_email ?? null)
        .input('ContactPerson', sql.NVarChar(150), party.contact_person ?? null)
        .input('IsActive', sql.Bit, party.is_active === undefined ? null : (party.is_active ? 1 : 0))
        .input('ModifiedBy', sql.NVarChar(50), modified_by ?? null)
        .execute('dbo.sp_Party_Update');

      // Upsert addresses (Option B: only update what is sent; no implicit deletions)
      for (const a of addresses || []) {
        if (a.address_id) {
          await new sql.Request(tx)
            .input('AddressID', sql.Int, a.address_id)
            .input('PartyID', sql.Int, party_id)
            .input('AddressType', sql.NVarChar(20), a.address_type ?? null)
            .input('Address1', sql.NVarChar(200), a.address1 ?? null)
            .input('Address2', sql.NVarChar(200), a.address2 ?? null)
            .input('Address3', sql.NVarChar(200), a.address3 ?? null)
            .input('CityID', sql.Int, a.city_id ?? null)
            .input('StateID', sql.Int, a.state_id ?? null)
            .input('CountryID', sql.Int, a.country_id ?? null)
            .input('PinCode', sql.NVarChar(10), a.pincode ?? null)
            .input('IsDefault', sql.Bit, a.is_default === undefined ? null : (a.is_default ? 1 : 0))
            .input('IsActive', sql.Bit, a.is_active === undefined ? null : (a.is_active ? 1 : 0))
            .query(`
              UPDATE dbo.PartyAddress
              SET
                AddressType = COALESCE(@AddressType, AddressType),
                Address1 = COALESCE(@Address1, Address1),
                Address2 = COALESCE(@Address2, Address2),
                Address3 = COALESCE(@Address3, Address3),
                CityID = COALESCE(@CityID, CityID),
                StateID = COALESCE(@StateID, StateID),
                CountryID = COALESCE(@CountryID, CountryID),
                PinCode = COALESCE(@PinCode, PinCode),
                IsDefault = COALESCE(@IsDefault, IsDefault),
                IsActive = COALESCE(@IsActive, IsActive)
              WHERE AddressID = @AddressID AND PartyID = @PartyID
            `);
        } else {
          await new sql.Request(tx)
            .input('PartyID', sql.Int, party_id)
            .input('AddressType', sql.NVarChar(20), a.address_type)
            .input('Address1', sql.NVarChar(200), a.address1)
            .input('Address2', sql.NVarChar(200), a.address2 ?? null)
            .input('Address3', sql.NVarChar(200), a.address3 ?? null)
            .input('CityID', sql.Int, a.city_id ?? null)
            .input('StateID', sql.Int, a.state_id ?? null)
            .input('CountryID', sql.Int, a.country_id ?? null)
            .input('PinCode', sql.NVarChar(10), a.pincode ?? null)
            .input('IsDefault', sql.Bit, a.is_default ? 1 : 0)
            .input('IsActive', sql.Bit, a.is_active === false ? 0 : 1)
            .query(`
              INSERT INTO dbo.PartyAddress (
                PartyID, AddressType, Address1, Address2, Address3,
                CityID, StateID, CountryID, PinCode,
                IsDefault, IsActive
              )
              VALUES (
                @PartyID, @AddressType, @Address1, @Address2, @Address3,
                @CityID, @StateID, @CountryID, @PinCode,
                @IsDefault, @IsActive
              );
            `);
        }
      }

      // Upsert contacts (Option B); enforce single primary
      let primarySeen = false;
      for (const c of contacts || []) {
        const wantsPrimary = !!c.is_primary;
        const isPrimary = wantsPrimary && !primarySeen;
        if (isPrimary) primarySeen = true;

        if (c.contact_id) {
          await new sql.Request(tx)
            .input('ContactID', sql.Int, c.contact_id)
            .input('PartyID', sql.Int, party_id)
            .input('FirstName', sql.NVarChar(100), c.first_name ?? null)
            .input('LastName', sql.NVarChar(100), c.last_name ?? null)
            .input('ContactPerson', sql.NVarChar(150), c.contact_person ?? null)
            .input('Email', sql.NVarChar(150), c.email ?? null)
            .input('MobileNo', sql.NVarChar(15), c.mobile_no ?? null)
            .input('PhoneNo', sql.NVarChar(20), c.phone_no ?? null)
            .input('IsPrimary', sql.Bit, c.is_primary === undefined ? null : (isPrimary ? 1 : 0))
            .input('IsActive', sql.Bit, c.is_active === undefined ? null : (c.is_active ? 1 : 0))
            .query(`
              UPDATE dbo.PartyContact
              SET
                FirstName = COALESCE(@FirstName, FirstName),
                LastName = COALESCE(@LastName, LastName),
                ContactPerson = COALESCE(@ContactPerson, ContactPerson),
                Email = COALESCE(@Email, Email),
                MobileNo = COALESCE(@MobileNo, MobileNo),
                PhoneNo = COALESCE(@PhoneNo, PhoneNo),
                IsPrimary = COALESCE(@IsPrimary, IsPrimary),
                IsActive = COALESCE(@IsActive, IsActive)
              WHERE ContactID = @ContactID AND PartyID = @PartyID
            `);
        } else {
          await new sql.Request(tx)
            .input('PartyID', sql.Int, party_id)
            .input('FirstName', sql.NVarChar(100), c.first_name)
            .input('LastName', sql.NVarChar(100), c.last_name ?? null)
            .input('ContactPerson', sql.NVarChar(150), c.contact_person ?? null)
            .input('Email', sql.NVarChar(150), c.email ?? null)
            .input('MobileNo', sql.NVarChar(15), c.mobile_no ?? null)
            .input('PhoneNo', sql.NVarChar(20), c.phone_no ?? null)
            .input('IsPrimary', sql.Bit, isPrimary ? 1 : 0)
            .input('IsActive', sql.Bit, c.is_active === false ? 0 : 1)
            .query(`
              INSERT INTO dbo.PartyContact (
                PartyID, FirstName, LastName, ContactPerson,
                Email, MobileNo, PhoneNo, IsPrimary, IsActive
              )
              VALUES (
                @PartyID, @FirstName, @LastName, @ContactPerson,
                @Email, @MobileNo, @PhoneNo, @IsPrimary, @IsActive
              );
            `);
        }
      }

      // Normalize defaults and primary contact uniqueness
      await new sql.Request(tx).input('PartyID', sql.Int, party_id).query(`
        UPDATE pa
        SET IsDefault = 0
        FROM dbo.PartyAddress pa
        INNER JOIN (
          SELECT PartyID, AddressType, MIN(AddressID) AS KeepId
          FROM dbo.PartyAddress
          WHERE PartyID = @PartyID AND IsActive = 1 AND IsDefault = 1
          GROUP BY PartyID, AddressType
        ) x ON pa.PartyID = x.PartyID AND pa.AddressType = x.AddressType
        WHERE pa.PartyID = @PartyID AND pa.AddressType = x.AddressType
          AND pa.AddressID <> x.KeepId AND pa.IsActive = 1;
      `);

      await new sql.Request(tx).input('PartyID', sql.Int, party_id).query(`
        WITH prim AS (
          SELECT ContactID, ROW_NUMBER() OVER (ORDER BY ContactID) AS rn
          FROM dbo.PartyContact
          WHERE PartyID = @PartyID AND IsActive = 1 AND IsPrimary = 1
        )
        UPDATE dbo.PartyContact
        SET IsPrimary = 0
        WHERE PartyID = @PartyID AND ContactID IN (SELECT ContactID FROM prim WHERE rn > 1);
      `);

      await tx.commit();
      return { message: 'Party updated successfully' };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async softDeleteParty({ company_id, branch_id, party_id, modified_by }) {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('CompanyID', sql.Int, company_id)
        .input('BranchID', sql.Int, branch_id)
        .input('PartyID', sql.Int, party_id)
        .input('ModifiedBy', sql.NVarChar(50), modified_by ?? null)
        .execute('dbo.sp_Party_Deactivate');

      // Optional: also deactivate child rows
      await new sql.Request(tx).input('PartyID', sql.Int, party_id).query(`
        UPDATE dbo.PartyAddress SET IsActive = 0 WHERE PartyID = @PartyID;
        UPDATE dbo.PartyContact SET IsActive = 0 WHERE PartyID = @PartyID;
      `);

      await tx.commit();
      return { message: 'Party deleted successfully' };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
}

module.exports = new PartyRepository();


