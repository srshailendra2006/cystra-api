const { sql, getPool } = require('../db');

class PartyAddressRepository {
  async listByParty({ company_id, branch_id, party_id }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('company_id', sql.Int, company_id)
      .input('branch_id', sql.Int, branch_id)
      .input('party_id', sql.Int, party_id)
      .query(`
        SELECT
          pa.AddressID as address_id,
          pa.PartyID as party_id,
          pa.AddressType as address_type,
          pa.Address1 as address1,
          pa.Address2 as address2,
          pa.Address3 as address3,
          pa.CityID as city_id,
          pa.StateID as state_id,
          pa.CountryID as country_id,
          pa.PinCode as pincode,
          pa.IsDefault as is_default,
          pa.IsActive as is_active
        FROM dbo.PartyAddress pa
        INNER JOIN dbo.PartyMaster pm ON pm.PartyID = pa.PartyID
        WHERE pa.PartyID = @party_id
          AND pa.IsActive = 1
          AND pm.IsActive = 1
          AND pm.CompanyID = @company_id
          AND pm.BranchID = @branch_id
        ORDER BY pa.AddressType ASC, pa.IsDefault DESC, pa.AddressID ASC
      `);

    return result.recordset || [];
  }

  async create({ company_id, branch_id, party_id, address }) {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // validate party scope + existence
      const party = await new sql.Request(tx)
        .input('company_id', sql.Int, company_id)
        .input('branch_id', sql.Int, branch_id)
        .input('party_id', sql.Int, party_id)
        .query(`
          SELECT PartyID
          FROM dbo.PartyMaster
          WHERE PartyID = @party_id
            AND CompanyID = @company_id
            AND BranchID = @branch_id
            AND IsActive = 1
        `);
      if (!party.recordset?.length) {
        const err = new Error('Party not found');
        err.status = 404;
        throw err;
      }

      const created = await new sql.Request(tx)
        .input('PartyID', sql.Int, party_id)
        .input('AddressType', sql.NVarChar(20), address.address_type)
        .input('Address1', sql.NVarChar(200), address.address1)
        .input('Address2', sql.NVarChar(200), address.address2 ?? null)
        .input('Address3', sql.NVarChar(200), address.address3 ?? null)
        .input('CityID', sql.Int, address.city_id ?? null)
        .input('StateID', sql.Int, address.state_id ?? null)
        .input('CountryID', sql.Int, address.country_id ?? null)
        .input('PinCode', sql.NVarChar(10), address.pincode ?? null)
        .input('IsDefault', sql.Bit, address.is_default ? 1 : 0)
        .query(`
          INSERT INTO dbo.PartyAddress (
            PartyID, AddressType, Address1, Address2, Address3,
            CityID, StateID, CountryID, PinCode,
            IsDefault, IsActive
          )
          VALUES (
            @PartyID, @AddressType, @Address1, @Address2, @Address3,
            @CityID, @StateID, @CountryID, @PinCode,
            @IsDefault, 1
          );
          SELECT SCOPE_IDENTITY() AS address_id;
        `);

      const address_id = created.recordset?.[0]?.address_id;
      if (!address_id) throw new Error('Failed to create address');

      // If new address is default, unset other defaults for same party + type
      if (address.is_default) {
        await new sql.Request(tx)
          .input('PartyID', sql.Int, party_id)
          .input('AddressType', sql.NVarChar(20), address.address_type)
          .input('KeepID', sql.Int, address_id)
          .query(`
            UPDATE dbo.PartyAddress
            SET IsDefault = 0
            WHERE PartyID = @PartyID
              AND AddressType = @AddressType
              AND IsActive = 1
              AND AddressID <> @KeepID
          `);
      }

      await tx.commit();
      return { address_id };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async update({ company_id, branch_id, address_id, address }) {
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      // validate address scope via party join
      const existing = await new sql.Request(tx)
        .input('company_id', sql.Int, company_id)
        .input('branch_id', sql.Int, branch_id)
        .input('address_id', sql.Int, address_id)
        .query(`
          SELECT
            pa.AddressID,
            pa.PartyID,
            pa.AddressType
          FROM dbo.PartyAddress pa
          INNER JOIN dbo.PartyMaster pm ON pm.PartyID = pa.PartyID
          WHERE pa.AddressID = @address_id
            AND pa.IsActive = 1
            AND pm.IsActive = 1
            AND pm.CompanyID = @company_id
            AND pm.BranchID = @branch_id
        `);

      const row = existing.recordset?.[0];
      if (!row) {
        const err = new Error('Address not found');
        err.status = 404;
        throw err;
      }

      const nextAddressType = address.address_type ?? row.AddressType;
      const nextIsDefault = address.is_default;

      await new sql.Request(tx)
        .input('AddressID', sql.Int, address_id)
        .input('AddressType', sql.NVarChar(20), address.address_type ?? null)
        .input('Address1', sql.NVarChar(200), address.address1 ?? null)
        .input('Address2', sql.NVarChar(200), address.address2 ?? null)
        .input('Address3', sql.NVarChar(200), address.address3 ?? null)
        .input('CityID', sql.Int, address.city_id ?? null)
        .input('StateID', sql.Int, address.state_id ?? null)
        .input('CountryID', sql.Int, address.country_id ?? null)
        .input('PinCode', sql.NVarChar(10), address.pincode ?? null)
        .input('IsDefault', sql.Bit, nextIsDefault === undefined ? null : (nextIsDefault ? 1 : 0))
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
            IsDefault = COALESCE(@IsDefault, IsDefault)
          WHERE AddressID = @AddressID
        `);

      // If set default true, unset other defaults for same party + type
      if (nextIsDefault === true) {
        await new sql.Request(tx)
          .input('PartyID', sql.Int, row.PartyID)
          .input('AddressType', sql.NVarChar(20), nextAddressType)
          .input('KeepID', sql.Int, address_id)
          .query(`
            UPDATE dbo.PartyAddress
            SET IsDefault = 0
            WHERE PartyID = @PartyID
              AND AddressType = @AddressType
              AND IsActive = 1
              AND AddressID <> @KeepID
          `);
      }

      await tx.commit();
      return { address_id };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async softDelete({ company_id, branch_id, address_id }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('company_id', sql.Int, company_id)
      .input('branch_id', sql.Int, branch_id)
      .input('address_id', sql.Int, address_id)
      .query(`
        UPDATE pa
        SET IsActive = 0, IsDefault = 0
        FROM dbo.PartyAddress pa
        INNER JOIN dbo.PartyMaster pm ON pm.PartyID = pa.PartyID
        WHERE pa.AddressID = @address_id
          AND pa.IsActive = 1
          AND pm.IsActive = 1
          AND pm.CompanyID = @company_id
          AND pm.BranchID = @branch_id;

        SELECT @@ROWCOUNT AS affected;
      `);

    const affected = result.recordset?.[0]?.affected ?? 0;
    if (!affected) {
      const err = new Error('Address not found');
      err.status = 404;
      throw err;
    }

    return { address_id };
  }
}

module.exports = new PartyAddressRepository();


