const partyService = require('../services/partyService');
const fs = require('fs');
const csv = require('csv-parser');
const { sql, getPool } = require('../db');

function enforceScope(req, company_id, branch_id) {
  const tokenCompany = req.user?.company_id ?? null;
  const tokenBranch = req.user?.branch_id ?? null;
  const permission = req.user?.permission_level ?? 10;

  // Cross-company forbidden unless super (>=100)
  if (tokenCompany && company_id && tokenCompany !== company_id && permission < 100) {
    const err = new Error('Forbidden (cross-company access not allowed)');
    err.status = 403;
    throw err;
  }

  // If branch provided and user is branch-scoped (<50), forbid other branches
  if (tokenBranch && branch_id && tokenBranch !== branch_id && permission < 50) {
    const err = new Error('Forbidden (cross-branch access not allowed)');
    err.status = 403;
    throw err;
  }
}

class PartyController {

  async getParties(req, res) {
    try {
      const company_id = parseInt(req.query.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.query.branch_id) || req.user?.branch_id;
      const search = req.query.search || null;
      const page = parseInt(req.query.page || '1');
      const limit = parseInt(req.query.limit || '50');

      enforceScope(req, company_id, branch_id);

      const result = await partyService.listParties({
        company_id,
        branch_id,
        search,
        page,
        limit
      });

      return res.status(200).json({
        status: 'success',
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.totalCount,
          totalPages: Math.ceil(result.totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Get parties error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get parties'
      });
    }
  }

  async getPartyDetails(req, res) {
    try {
      const party_id = parseInt(req.params.id);
      const company_id = parseInt(req.query.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.query.branch_id) || req.user?.branch_id;

      enforceScope(req, company_id, branch_id);

      const result = await partyService.getPartyDetails({
        party_id,
        company_id,
        branch_id
      });

      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Get party details error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to get party details'
      });
    }
  }

  async createParty(req, res) {
    try {
      const created_by = req.user?.user_id ? String(req.user.user_id) : (req.body.created_by ?? null);
      const company_id = parseInt(req.body.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.body.branch_id) || req.user?.branch_id;

      enforceScope(req, company_id, branch_id);

      const partyIn = req.body.party || {};
      const party = {
        ...partyIn,
        // accept UI aliases: party_code/party_name -> cust_code/cust_name
        cust_code: partyIn.cust_code ?? partyIn.party_code ?? req.body.cust_code ?? req.body.party_code,
        cust_name: partyIn.cust_name ?? partyIn.party_name ?? req.body.cust_name ?? req.body.party_name,
        party_phone: partyIn.party_phone ?? req.body.party_phone,
        party_email: partyIn.party_email ?? req.body.party_email,
        contact_person: partyIn.contact_person ?? req.body.contact_person,
        party_type_id: partyIn.party_type_id ?? req.body.party_type_id,
        party_category_id: partyIn.party_category_id ?? req.body.party_category_id,
        gst_num: partyIn.gst_num ?? req.body.gst_num,
        pan_no: partyIn.pan_no ?? req.body.pan_no,
        cin_no: partyIn.cin_no ?? req.body.cin_no,
        company_type: partyIn.company_type ?? req.body.company_type,
        msme_no: partyIn.msme_no ?? req.body.msme_no,
        msme_type: partyIn.msme_type ?? req.body.msme_type,
        udyam_no: partyIn.udyam_no ?? req.body.udyam_no
      };

      const result = await partyService.createPartyFull({
        company_id,
        branch_id,
        created_by,
        party,
        addresses: req.body.addresses || [],
        contacts: req.body.contacts || []
      });

      return res.status(201).json({
        status: 'success',
        message: 'Party created successfully',
        data: {
          party_id: result.party_id
        }
      });
    } catch (error) {
      console.error('Create party error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to create party'
      });
    }
  }

  async updateParty(req, res) {
    try {
      const party_id = parseInt(req.params.id);
      const company_id = parseInt(req.body.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.body.branch_id) || req.user?.branch_id;
      const modified_by = req.user?.user_id ? String(req.user.user_id) : (req.body.modified_by ?? null);

      enforceScope(req, company_id, branch_id);

      const partyIn = req.body.party || {};
      const party = {
        ...partyIn,
        // allow sending master fields either at top-level or nested under party
        // accept UI aliases: party_code/party_name -> cust_code/cust_name
        cust_code: partyIn.cust_code ?? partyIn.party_code ?? req.body.cust_code ?? req.body.party_code,
        cust_name: partyIn.cust_name ?? partyIn.party_name ?? req.body.cust_name ?? req.body.party_name,
        party_phone: partyIn.party_phone ?? req.body.party_phone,
        party_email: partyIn.party_email ?? req.body.party_email,
        contact_person: partyIn.contact_person ?? req.body.contact_person,
        party_type_id: partyIn.party_type_id ?? req.body.party_type_id,
        party_category_id: partyIn.party_category_id ?? req.body.party_category_id,
        gst_num: partyIn.gst_num ?? req.body.gst_num,
        pan_no: partyIn.pan_no ?? req.body.pan_no,
        cin_no: partyIn.cin_no ?? req.body.cin_no,
        company_type: partyIn.company_type ?? req.body.company_type,
        msme_no: partyIn.msme_no ?? req.body.msme_no,
        msme_type: partyIn.msme_type ?? req.body.msme_type,
        udyam_no: partyIn.udyam_no ?? req.body.udyam_no,
        is_active: partyIn.is_active ?? req.body.is_active
      };

      const result = await partyService.updatePartyFull({
        company_id,
        branch_id,
        party_id,
        modified_by,
        party,
        addresses: req.body.addresses || [],
        contacts: req.body.contacts || []
      });

      return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
      console.error('Update party error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to update party'
      });
    }
  }

  async deleteParty(req, res) {
    try {
      const party_id = parseInt(req.params.id);
      const company_id = parseInt(req.query.company_id) || req.user?.company_id;
      const branch_id = parseInt(req.query.branch_id) || req.user?.branch_id;
      const modified_by = req.user?.user_id ? String(req.user.user_id) : null;

      enforceScope(req, company_id, branch_id);

      const result = await partyService.deleteParty({
        party_id,
        company_id,
        branch_id,
        modified_by
      });

      return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
      console.error('Delete party error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to delete party'
      });
    }
  }

  /**
   * Bulk upload parties from CSV
   * - UPSERT PartyMaster by (company_id, branch_id, party_code/cust_code)
   * - Optional: Upsert one Address + one Contact per row
   */
  async uploadParties(req, res) {
    let filePath = null;
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded. Please upload a CSV file.' });
      }

      filePath = req.file.path;

      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });

      // Cleanup file after parsing
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      filePath = null;

      if (!rows.length) {
        return res.status(400).json({ status: 'error', message: 'No data found in the uploaded file' });
      }

      const pool = await getPool();
      const createdBy = req.user?.user_id ? String(req.user.user_id) : null;

      const results = {
        total: rows.length,
        inserted: 0,
        updated: 0,
        failed: 0,
        errors: [],
        upsertedRecords: []
      };

      // Helpers
      const toInt = (v) => {
        if (v === undefined || v === null || v === '') return null;
        const n = parseInt(String(v).trim(), 10);
        return Number.isNaN(n) ? null : n;
      };
      const toBitOrNull = (v) => {
        if (v === undefined || v === null || v === '') return null;
        const s = String(v).trim().toLowerCase();
        if (s === '1' || s === 'true' || s === 'yes') return 1;
        if (s === '0' || s === 'false' || s === 'no') return 0;
        return null;
      };
      const toTrimmedOrNull = (v) => {
        if (v === undefined || v === null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
      };
      const get = (row, keys) => {
        for (const k of keys) {
          if (Object.prototype.hasOwnProperty.call(row, k)) {
            const v = toTrimmedOrNull(row[k]);
            if (v !== null) return v;
          }
        }
        return null;
      };
      const isProcMissing = (err, procName) =>
        /Could not find stored procedure/i.test(err?.message || '') && new RegExp(procName, 'i').test(err?.message || '');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // header is row 1

        // Skip fully empty rows
        if (!Object.values(row || {}).some((v) => String(v ?? '').trim() !== '')) {
          results.total--;
          continue;
        }

        const company_id = toInt(get(row, ['company_id', 'companyId'])) ?? (req.user?.company_id ?? null);
        const branch_id = toInt(get(row, ['branch_id', 'branchId'])) ?? (req.user?.branch_id ?? null);

        try {
          enforceScope(req, company_id, branch_id);

          const party_code = get(row, ['party_code', 'cust_code', 'partyCode', 'custCode']);
          const party_name = get(row, ['party_name', 'cust_name', 'partyName', 'custName']);
          // Skip repeated header rows that sometimes appear in exported CSVs
          if (String(party_code || '').trim().toLowerCase() === 'party_code' || String(party_name || '').trim().toLowerCase() === 'party_name') {
            results.total--;
            continue;
          }
          if (!company_id || !branch_id || !party_code || !party_name) {
            throw new Error('company_id, branch_id, party_code and party_name are required');
          }

          const party_type_id = toInt(get(row, ['party_type_id', 'partyTypeId']));
          const party_category_id = toInt(get(row, ['party_category_id', 'partyCategoryId']));
          const gst_num = get(row, ['gst_num', 'gstNum']);
          const pan_no = get(row, ['pan_no', 'panNo']);
          const cin_no = get(row, ['cin_no', 'cinNo']);
          const company_type = get(row, ['company_type', 'companyType']);
          const msme_no = get(row, ['msme_no', 'msmeNo']);
          const msme_type = get(row, ['msme_type', 'msmeType']);
          const udyam_no = get(row, ['udyam_no', 'udyamNo']);
          const party_phone = get(row, ['party_phone', 'partyPhone']);
          const party_email = get(row, ['party_email', 'partyEmail']);
          const contact_person = get(row, ['contact_person', 'contactPerson']);
          const is_active = toBitOrNull(get(row, ['is_active', 'isActive']));

          // Address (optional block)
          const address_type = get(row, ['address_type', 'addressType']);
          const address1 = get(row, ['address1', 'address_1', 'address']);
          const address2 = get(row, ['address2', 'address_2']);
          const address3 = get(row, ['address3', 'address_3']);
          const city_id = toInt(get(row, ['city_id', 'cityId']));
          const state_id = toInt(get(row, ['state_id', 'stateId']));
          const country_id = toInt(get(row, ['country_id', 'countryId']));
          const pincode = get(row, ['pincode', 'pin_code', 'pinCode']);
          const is_default = toBitOrNull(get(row, ['is_default', 'isDefault']));
          const hasAddress = !!(address_type || address1 || address2 || address3 || city_id || state_id || country_id || pincode || is_default !== null);

          if (hasAddress && (!address_type || !address1)) {
            throw new Error('address_type and address1 are required when address columns are provided');
          }
          if (hasAddress && address_type) {
            const at = String(address_type).trim().toLowerCase();
            const allowed = new Set(['billing', 'shipping', 'registered', 'office', 'plant', 'other']);
            if (!allowed.has(at)) {
              throw new Error('address_type must be one of Billing, Shipping, Registered, Office, Plant, Other');
            }
          }

          // Contact (optional block)
          const contact_first_name = get(row, ['contact_first_name', 'first_name', 'firstName']);
          const contact_last_name = get(row, ['contact_last_name', 'last_name', 'lastName']);
          const contact_email = get(row, ['contact_email', 'email']);
          const contact_mobile_no = get(row, ['contact_mobile_no', 'mobile_no', 'mobile']);
          const contact_phone_no = get(row, ['contact_phone_no', 'phone_no', 'phone']);
          const contact_contact_person = get(row, ['contact_person_name', 'contact_contact_person']);
          const is_primary = toBitOrNull(get(row, ['is_primary', 'isPrimary']));
          const contact_is_active = toBitOrNull(get(row, ['contact_is_active', 'contactIsActive']));
          const hasContact =
            !!(contact_first_name || contact_last_name || contact_email || contact_mobile_no || contact_phone_no || is_primary !== null || contact_is_active !== null);

          if (hasContact && !contact_first_name) {
            throw new Error('contact_first_name is required when contact columns are provided');
          }

          const tx = new sql.Transaction(pool);
          await tx.begin();
          try {
            // 1) UPSERT PartyMaster
            let party_id = null;
            let action = null;

            try {
              const r = await new sql.Request(tx)
                .input('CompanyID', sql.Int, company_id)
                .input('BranchID', sql.Int, branch_id)
                .input('CustCode', sql.NVarChar(20), party_code)
                .input('CustName', sql.NVarChar(200), party_name)
                .input('PartyTypeID', sql.Int, party_type_id)
                .input('PartyCategoryID', sql.Int, party_category_id)
                .input('GSTNum', sql.NVarChar(25), gst_num)
                .input('PANNo', sql.NVarChar(15), pan_no)
                .input('CINNo', sql.NVarChar(25), cin_no)
                .input('CompanyType', sql.NVarChar(50), company_type)
                .input('MSMENo', sql.NVarChar(30), msme_no)
                .input('MSMEType', sql.NVarChar(50), msme_type)
                .input('UdyamNo', sql.NVarChar(30), udyam_no)
                .input('PartyPhone', sql.NVarChar(20), party_phone)
                .input('PartyEmail', sql.NVarChar(150), party_email)
                .input('ContactPerson', sql.NVarChar(150), contact_person)
                .input('IsActive', sql.Bit, is_active === null ? null : Boolean(is_active))
                .input('User', sql.NVarChar(50), createdBy)
                .execute('dbo.sp_Party_UpsertByCode');

              party_id = r.recordset?.[0]?.party_id ?? null;
              action = r.recordset?.[0]?.action ?? null;
            } catch (e) {
              // Fallback to inline UPSERT if SP not installed yet
              if (!isProcMissing(e, 'sp_Party_UpsertByCode')) throw e;

              const exists = await new sql.Request(tx)
                .input('CompanyID', sql.Int, company_id)
                .input('BranchID', sql.Int, branch_id)
                .input('CustCode', sql.NVarChar(20), party_code)
                .query(`
                  SELECT TOP 1 PartyID as party_id
                  FROM dbo.PartyMaster
                  WHERE CompanyID=@CompanyID AND BranchID=@BranchID AND CustCode=@CustCode
                `);

              party_id = exists.recordset?.[0]?.party_id ?? null;
              if (!party_id) {
                const ins = await new sql.Request(tx)
                  .input('CompanyID', sql.Int, company_id)
                  .input('BranchID', sql.Int, branch_id)
                  .input('CustCode', sql.NVarChar(20), party_code)
                  .input('CustName', sql.NVarChar(200), party_name)
                  .input('PartyTypeID', sql.Int, party_type_id)
                  .input('PartyCategoryID', sql.Int, party_category_id)
                  .input('GSTNum', sql.NVarChar(25), gst_num)
                  .input('PANNo', sql.NVarChar(15), pan_no)
                  .input('CINNo', sql.NVarChar(25), cin_no)
                  .input('CompanyType', sql.NVarChar(50), company_type)
                  .input('MSMENo', sql.NVarChar(30), msme_no)
                  .input('MSMEType', sql.NVarChar(50), msme_type)
                  .input('UdyamNo', sql.NVarChar(30), udyam_no)
                  .input('PartyPhone', sql.NVarChar(20), party_phone)
                  .input('PartyEmail', sql.NVarChar(150), party_email)
                  .input('ContactPerson', sql.NVarChar(150), contact_person)
                  .input('IsActive', sql.Bit, is_active === null ? 1 : is_active)
                  .input('CreatedBy', sql.NVarChar(50), createdBy)
                  .query(`
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
                      @IsActive, GETDATE(), @CreatedBy
                    );
                    SELECT SCOPE_IDENTITY() AS party_id;
                  `);
                party_id = ins.recordset?.[0]?.party_id ?? null;
                action = 'INSERT';
              } else {
                await new sql.Request(tx)
                  .input('PartyID', sql.Int, party_id)
                  .input('CustName', sql.NVarChar(200), party_name)
                  .input('PartyTypeID', sql.Int, party_type_id)
                  .input('PartyCategoryID', sql.Int, party_category_id)
                  .input('GSTNum', sql.NVarChar(25), gst_num)
                  .input('PANNo', sql.NVarChar(15), pan_no)
                  .input('CINNo', sql.NVarChar(25), cin_no)
                  .input('CompanyType', sql.NVarChar(50), company_type)
                  .input('MSMENo', sql.NVarChar(30), msme_no)
                  .input('MSMEType', sql.NVarChar(50), msme_type)
                  .input('UdyamNo', sql.NVarChar(30), udyam_no)
                  .input('PartyPhone', sql.NVarChar(20), party_phone)
                  .input('PartyEmail', sql.NVarChar(150), party_email)
                  .input('ContactPerson', sql.NVarChar(150), contact_person)
                  .input('IsActive', sql.Bit, is_active)
                  .input('ModifiedBy', sql.NVarChar(50), createdBy)
                  .query(`
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
                      ModifiedBy = COALESCE(@ModifiedBy, ModifiedBy)
                    WHERE PartyID=@PartyID;
                  `);
                action = 'UPDATE';
              }
            }

            if (!party_id) throw new Error('Party upsert failed');

            // 2) Address upsert (optional)
            if (hasAddress) {
              try {
                await new sql.Request(tx)
                  .input('PartyID', sql.Int, party_id)
                  .input('AddressType', sql.NVarChar(20), address_type)
                  .input('Address1', sql.NVarChar(200), address1)
                  .input('PinCode', sql.NVarChar(10), pincode)
                  .input('Address2', sql.NVarChar(200), address2)
                  .input('Address3', sql.NVarChar(200), address3)
                  .input('CityID', sql.Int, city_id)
                  .input('StateID', sql.Int, state_id)
                  .input('CountryID', sql.Int, country_id)
                  .input('IsDefault', sql.Bit, is_default === null ? null : Boolean(is_default))
                  .input('IsActive', sql.Bit, true)
                  .execute('dbo.sp_PartyAddress_UpsertByNaturalKey');
              } catch (e) {
                if (!isProcMissing(e, 'sp_PartyAddress_UpsertByNaturalKey')) throw e;

                const ex = await new sql.Request(tx)
                  .input('PartyID', sql.Int, party_id)
                  .input('AddressType', sql.NVarChar(20), address_type)
                  .input('Address1', sql.NVarChar(200), address1)
                  .input('PinCode', sql.NVarChar(10), pincode)
                  .query(`
                    SELECT TOP 1 AddressID as address_id
                    FROM dbo.PartyAddress
                    WHERE PartyID=@PartyID AND AddressType=@AddressType AND Address1=@Address1 AND ISNULL(PinCode,'')=ISNULL(@PinCode,'')
                  `);
                const address_id = ex.recordset?.[0]?.address_id ?? null;
                if (!address_id) {
                  const ins = await new sql.Request(tx)
                    .input('PartyID', sql.Int, party_id)
                    .input('AddressType', sql.NVarChar(20), address_type)
                    .input('Address1', sql.NVarChar(200), address1)
                    .input('Address2', sql.NVarChar(200), address2)
                    .input('Address3', sql.NVarChar(200), address3)
                    .input('CityID', sql.Int, city_id)
                    .input('StateID', sql.Int, state_id)
                    .input('CountryID', sql.Int, country_id)
                    .input('PinCode', sql.NVarChar(10), pincode)
                    .input('IsDefault', sql.Bit, is_default === 1 ? 1 : 0)
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
                  const newId = ins.recordset?.[0]?.address_id ?? null;
                  if (!newId) throw new Error('Address insert failed');
                  if (is_default === 1) {
                    await new sql.Request(tx)
                      .input('PartyID', sql.Int, party_id)
                      .input('AddressType', sql.NVarChar(20), address_type)
                      .input('KeepID', sql.Int, newId)
                      .query(`
                        UPDATE dbo.PartyAddress
                        SET IsDefault=0
                        WHERE PartyID=@PartyID AND AddressType=@AddressType AND IsActive=1 AND AddressID<>@KeepID
                      `);
                  }
                } else {
                  await new sql.Request(tx)
                    .input('AddressID', sql.Int, address_id)
                    .input('Address2', sql.NVarChar(200), address2)
                    .input('Address3', sql.NVarChar(200), address3)
                    .input('CityID', sql.Int, city_id)
                    .input('StateID', sql.Int, state_id)
                    .input('CountryID', sql.Int, country_id)
                    .input('IsDefault', sql.Bit, is_default === null ? null : (is_default ? 1 : 0))
                    .query(`
                      UPDATE dbo.PartyAddress
                      SET
                        Address2=COALESCE(@Address2,Address2),
                        Address3=COALESCE(@Address3,Address3),
                        CityID=COALESCE(@CityID,CityID),
                        StateID=COALESCE(@StateID,StateID),
                        CountryID=COALESCE(@CountryID,CountryID),
                        IsDefault=COALESCE(@IsDefault,IsDefault),
                        IsActive=1
                      WHERE AddressID=@AddressID
                    `);
                  if (is_default === 1) {
                    await new sql.Request(tx)
                      .input('PartyID', sql.Int, party_id)
                      .input('AddressType', sql.NVarChar(20), address_type)
                      .input('KeepID', sql.Int, address_id)
                      .query(`
                        UPDATE dbo.PartyAddress
                        SET IsDefault=0
                        WHERE PartyID=@PartyID AND AddressType=@AddressType AND IsActive=1 AND AddressID<>@KeepID
                      `);
                  }
                }
              }
            }

            // 3) Contact upsert (optional)
            if (hasContact) {
              try {
                await new sql.Request(tx)
                  .input('PartyID', sql.Int, party_id)
                  .input('FirstName', sql.NVarChar(100), contact_first_name)
                  .input('LastName', sql.NVarChar(100), contact_last_name)
                  .input('ContactPerson', sql.NVarChar(150), contact_contact_person)
                  .input('Email', sql.NVarChar(150), contact_email)
                  .input('MobileNo', sql.NVarChar(15), contact_mobile_no)
                  .input('PhoneNo', sql.NVarChar(20), contact_phone_no)
                  .input('IsPrimary', sql.Bit, is_primary === null ? null : Boolean(is_primary))
                  .input('IsActive', sql.Bit, contact_is_active === null ? true : Boolean(contact_is_active))
                  .execute('dbo.sp_PartyContact_UpsertByNaturalKey');
              } catch (e) {
                if (!isProcMissing(e, 'sp_PartyContact_UpsertByNaturalKey')) throw e;

                // Determine match key
                let matchQuery = null;
                if (contact_email) matchQuery = 'Email=@Email';
                else if (contact_mobile_no) matchQuery = 'MobileNo=@MobileNo';
                else if (contact_phone_no) matchQuery = 'PhoneNo=@PhoneNo';
                else matchQuery = 'FirstName=@FirstName AND ISNULL(LastName,\'\')=ISNULL(@LastName,\'\')';

                const ex = await new sql.Request(tx)
                  .input('PartyID', sql.Int, party_id)
                  .input('Email', sql.NVarChar(150), contact_email)
                  .input('MobileNo', sql.NVarChar(15), contact_mobile_no)
                  .input('PhoneNo', sql.NVarChar(20), contact_phone_no)
                  .input('FirstName', sql.NVarChar(100), contact_first_name)
                  .input('LastName', sql.NVarChar(100), contact_last_name)
                  .query(`
                    SELECT TOP 1 ContactID as contact_id
                    FROM dbo.PartyContact
                    WHERE PartyID=@PartyID AND ${matchQuery}
                  `);
                const contact_id = ex.recordset?.[0]?.contact_id ?? null;
                if (!contact_id) {
                  const ins = await new sql.Request(tx)
                    .input('PartyID', sql.Int, party_id)
                    .input('FirstName', sql.NVarChar(100), contact_first_name)
                    .input('LastName', sql.NVarChar(100), contact_last_name)
                    .input('ContactPerson', sql.NVarChar(150), contact_contact_person)
                    .input('Email', sql.NVarChar(150), contact_email)
                    .input('MobileNo', sql.NVarChar(15), contact_mobile_no)
                    .input('PhoneNo', sql.NVarChar(20), contact_phone_no)
                    .input('IsPrimary', sql.Bit, is_primary === 1 ? 1 : 0)
                    .input('IsActive', sql.Bit, contact_is_active === 0 ? 0 : 1)
                    .query(`
                      INSERT INTO dbo.PartyContact (
                        PartyID, FirstName, LastName, ContactPerson,
                        Email, MobileNo, PhoneNo, IsPrimary, IsActive
                      )
                      VALUES (
                        @PartyID, @FirstName, @LastName, @ContactPerson,
                        @Email, @MobileNo, @PhoneNo, @IsPrimary, @IsActive
                      );
                      SELECT SCOPE_IDENTITY() AS contact_id;
                    `);
                  const newId = ins.recordset?.[0]?.contact_id ?? null;
                  if (!newId) throw new Error('Contact insert failed');
                  if (is_primary === 1) {
                    await new sql.Request(tx)
                      .input('PartyID', sql.Int, party_id)
                      .input('KeepID', sql.Int, newId)
                      .query(`UPDATE dbo.PartyContact SET IsPrimary=0 WHERE PartyID=@PartyID AND IsActive=1 AND ContactID<>@KeepID`);
                  }
                } else {
                  await new sql.Request(tx)
                    .input('ContactID', sql.Int, contact_id)
                    .input('LastName', sql.NVarChar(100), contact_last_name)
                    .input('ContactPerson', sql.NVarChar(150), contact_contact_person)
                    .input('Email', sql.NVarChar(150), contact_email)
                    .input('MobileNo', sql.NVarChar(15), contact_mobile_no)
                    .input('PhoneNo', sql.NVarChar(20), contact_phone_no)
                    .input('IsPrimary', sql.Bit, is_primary === null ? null : (is_primary ? 1 : 0))
                    .input('IsActive', sql.Bit, contact_is_active === null ? null : (contact_is_active ? 1 : 0))
                    .query(`
                      UPDATE dbo.PartyContact
                      SET
                        LastName = COALESCE(@LastName, LastName),
                        ContactPerson = COALESCE(@ContactPerson, ContactPerson),
                        Email = COALESCE(@Email, Email),
                        MobileNo = COALESCE(@MobileNo, MobileNo),
                        PhoneNo = COALESCE(@PhoneNo, PhoneNo),
                        IsPrimary = COALESCE(@IsPrimary, IsPrimary),
                        IsActive = COALESCE(@IsActive, IsActive)
                      WHERE ContactID=@ContactID
                    `);
                  if (is_primary === 1) {
                    await new sql.Request(tx)
                      .input('PartyID', sql.Int, party_id)
                      .input('KeepID', sql.Int, contact_id)
                      .query(`UPDATE dbo.PartyContact SET IsPrimary=0 WHERE PartyID=@PartyID AND IsActive=1 AND ContactID<>@KeepID`);
                  }
                }
              }
            }

            await tx.commit();

            if (String(action || '').toUpperCase() === 'INSERT') results.inserted++;
            else results.updated++;

            results.upsertedRecords.push({
              party_id,
              company_id,
              branch_id,
              party_code,
              party_name,
              action: action || 'UPSERT'
            });
          } catch (e) {
            await tx.rollback();
            throw e;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            company_id,
            branch_id,
            party_code: row.party_code ?? row.cust_code ?? null,
            error: error.message || String(error)
          });
        }
      }

      return res.status(200).json({
        status: 'success',
        message: `Upload complete. ${results.inserted} inserted, ${results.updated} updated, ${results.failed} failed.`,
        data: {
          total: results.total,
          inserted: results.inserted,
          updated: results.updated,
          failed: results.failed,
          errors: results.errors.slice(0, 10),
          upsertedRecords: results.upsertedRecords
        }
      });
    } catch (error) {
      console.error('Upload parties error:', error);
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to upload parties'
      });
    }
  }
}

module.exports = new PartyController();


