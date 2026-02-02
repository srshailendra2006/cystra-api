const { sql, getPool } = require('../db');

class CylinderRepository {
  async recalcCylinderDates(tx, cylinderId) {
    // pick the latest remaining test for this cylinder
    const latest = await new sql.Request(tx)
      .input('cylinder_id', sql.Int, cylinderId)
      .query(`
        SELECT TOP 1 test_date, next_test_date
        FROM cylinder_tests
        WHERE cylinder_id = @cylinder_id
        ORDER BY test_date DESC, created_at DESC
      `);

    const last_test_date = latest.recordset?.[0]?.test_date ?? null;
    const next_test_date = latest.recordset?.[0]?.next_test_date ?? null;

    await new sql.Request(tx)
      .input('cylinder_id', sql.Int, cylinderId)
      .input('last_test_date', sql.Date, last_test_date)
      .input('next_test_date', sql.Date, next_test_date)
      .query(`
        UPDATE cylinders
        SET last_test_date = @last_test_date,
            next_test_date = @next_test_date,
            updated_at = GETDATE()
        WHERE id = @cylinder_id
      `);
  }

  async recalcCylinderDates(tx, cylinderId) {
    // pick the latest remaining test for this cylinder
    const latest = await new sql.Request(tx)
      .input('cylinder_id', sql.Int, cylinderId)
      .query(`
        SELECT TOP 1 test_date, next_test_date
        FROM cylinder_tests
        WHERE cylinder_id = @cylinder_id
        ORDER BY test_date DESC, created_at DESC
      `);

    const last_test_date = latest.recordset?.[0]?.test_date ?? null;
    const next_test_date = latest.recordset?.[0]?.next_test_date ?? null;

    await new sql.Request(tx)
      .input('cylinder_id', sql.Int, cylinderId)
      .input('last_test_date', sql.Date, last_test_date)
      .input('next_test_date', sql.Date, next_test_date)
      .query(`
        UPDATE cylinders
        SET last_test_date = @last_test_date,
            next_test_date = @next_test_date,
            updated_at = GETDATE()
        WHERE id = @cylinder_id
      `);
  }

  /**
   * Create a new cylinder
   */
  async createCylinder(cylinderData) {
    try {
      const pool = await getPool();
      
      // Step 1: Create the cylinder (matching sp_CreateCylinder parameters)
      const result = await pool.request()
        .input('company_id', sql.Int, cylinderData.company_id)
        .input('branch_id', sql.Int, cylinderData.branch_id)
        .input('cylinder_code', sql.NVarChar(50), cylinderData.cylinder_code)
        .input('serial_number', sql.NVarChar(100), cylinderData.serial_number || null)
        .input('barcode_number', sql.NVarChar(100), cylinderData.barcode_number || null)
        .input('cylinder_type', sql.NVarChar(50), cylinderData.cylinder_type || null)
        .input('cylinder_family_code', sql.NVarChar(50), cylinderData.cylinder_family_code ?? null)
        .input('gas_content', sql.NVarChar(50), cylinderData.gas_content ?? null)
        .input('manufacture_no', sql.NVarChar(100), cylinderData.manufacture_no ?? null)
        .input('challan_no', sql.NVarChar(50), cylinderData.challan_no ?? null)
        .input('capacity', sql.Decimal(10, 2), cylinderData.capacity || null)
        .input('capacity_unit', sql.NVarChar(20), cylinderData.capacity_unit || null)
        .input('manufacturer', sql.NVarChar(100), cylinderData.manufacturer || null)
        .input('manufacture_date', sql.Date, cylinderData.manufacture_date || null)
        .input('last_test_date', sql.Date, cylinderData.last_test_date || null)
        .input('next_test_date', sql.Date, cylinderData.next_test_date || null)
        .input('status', sql.NVarChar(20), cylinderData.status || 'available')
        .input('owner_type', sql.NVarChar(10), cylinderData.owner_type)
        .input('owner_party_id', sql.Int, cylinderData.owner_party_id ?? null)
        .input('current_holder_party_id', sql.Int, cylinderData.current_holder_party_id ?? null)
        .input('ownership_remarks', sql.NVarChar(250), cylinderData.ownership_remarks ?? null)
        .input('created_by', sql.Int, cylinderData.created_by || null)
        .output('cylinder_id', sql.Int)
        .output('error_message', sql.NVarChar(500))
        .execute('sp_CreateCylinder');

      const cylinderId = result.output.cylinder_id;
      const errorMessage = result.output.error_message;

      if (!cylinderId) {
        throw new Error(errorMessage || 'Failed to create cylinder');
      }

      // Step 2: If test data is provided, create a test record (matching sp_CreateCylinderTest parameters)
      let testId = null;
      if (cylinderData.test_date && cylinderData.test_type && cylinderData.test_result) {
        try {
          const testResult = await pool.request()
            .input('company_id', sql.Int, cylinderData.company_id)
            .input('branch_id', sql.Int, cylinderData.branch_id)
            .input('cylinder_id', sql.Int, cylinderId)
            .input('test_date', sql.Date, cylinderData.test_date)
            .input('test_type', sql.NVarChar(50), cylinderData.test_type)
            .input('test_pressure', sql.Decimal(10, 2), cylinderData.test_pressure || null)
            .input('test_result', sql.NVarChar(20), cylinderData.test_result)
            .input('inspector_name', sql.NVarChar(100), cylinderData.inspector_name || null)
            .input('notes', sql.NVarChar(sql.MAX), cylinderData.test_notes || null)
            .input('next_test_date', sql.Date, cylinderData.next_test_date || null)
            .input('tested_by', sql.Int, cylinderData.tested_by || cylinderData.created_by || null)
            .output('test_id', sql.Int)
            .output('error_message', sql.NVarChar(500))
            .execute('sp_CreateCylinderTest');

          testId = testResult.output.test_id;
          console.log(`✓ Cylinder test record created: ${testId}`);
        } catch (testError) {
          console.error('Warning: Failed to create test record:', testError.message);
          // Don't throw error - cylinder is already created, just log the warning
        }
      }

      return {
        cylinder_id: cylinderId,
        test_id: testId,
        message: errorMessage
      };
    } catch (err) {
      throw new Error(`Error creating cylinder: ${err.message}`);
    }
  }

  /**
   * Get cylinder by ID
   */
  async getCylinderById(cylinderId, companyId, branchId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('cylinder_id', sql.Int, cylinderId)
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .execute('sp_GetCylinderById');

      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Error getting cylinder: ${err.message}`);
    }
  }

  /**
   * Get cylinders by company and branch with pagination and filters
   * Returns: { data: [...], totalCount: number }
   */
  async getCylindersByCompanyBranch(filters) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('company_id', sql.Int, filters.company_id)
        .input('branch_id', sql.Int, filters.branch_id)
        .input('page_number', sql.Int, filters.page_number || 1)
        .input('page_size', sql.Int, filters.page_size || 10)
        .input('search_term', sql.NVarChar(255), filters.search_term || null)
        .input('status', sql.NVarChar(20), filters.status || null)
        .input('is_active', sql.Bit, filters.is_active !== undefined ? filters.is_active : null)
        .execute('sp_GetCylindersByCompanyBranch');

      // SP returns two result sets: 
      // recordsets[0] = paginated cylinder data
      // recordsets[1] = total count
      const cylinders = result.recordsets[0] || [];
      const totalCount = result.recordsets[1]?.[0]?.total_count || cylinders.length;

      return {
        data: cylinders,
        totalCount: totalCount
      };
    } catch (err) {
      throw new Error(`Error getting cylinders: ${err.message}`);
    }
  }

  /**
   * Update cylinder
   */
  async updateCylinder(cylinderId, companyId, branchId, updateData) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('cylinder_id', sql.Int, cylinderId)
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .input('cylinder_code', sql.NVarChar(50), updateData.cylinder_code || null)
        .input('serial_number', sql.NVarChar(100), updateData.serial_number || null)
        .input('barcode_number', sql.NVarChar(100), updateData.barcode_number || null)
        .input('cylinder_type', sql.NVarChar(50), updateData.cylinder_type || null)
        .input('cylinder_family_code', sql.NVarChar(50), updateData.cylinder_family_code ?? null)
        .input('gas_content', sql.NVarChar(50), updateData.gas_content ?? null)
        .input('manufacture_no', sql.NVarChar(100), updateData.manufacture_no ?? null)
        .input('challan_no', sql.NVarChar(50), updateData.challan_no ?? null)
        .input('capacity', sql.Decimal(10, 2), updateData.capacity || null)
        .input('capacity_unit', sql.NVarChar(20), updateData.capacity_unit || null)
        .input('manufacturer', sql.NVarChar(100), updateData.manufacturer || null)
        .input('manufacture_date', sql.Date, updateData.manufacture_date || null)
        .input('last_test_date', sql.Date, updateData.last_test_date || null)
        .input('next_test_date', sql.Date, updateData.next_test_date || null)
        .input('status', sql.NVarChar(20), updateData.status || null)
        .input('owner_type', sql.NVarChar(10), updateData.owner_type ?? null)
        .input('owner_party_id', sql.Int, updateData.owner_party_id ?? null)
        .input('current_holder_party_id', sql.Int, updateData.current_holder_party_id ?? null)
        .input('ownership_remarks', sql.NVarChar(250), updateData.ownership_remarks ?? null)
        .input('is_active', sql.Bit, updateData.is_active !== undefined ? updateData.is_active : null)
        .output('error_message', sql.NVarChar(500))
        .execute('sp_UpdateCylinder');

      const errorMessage = result.output.error_message;
      return { message: errorMessage };
    } catch (err) {
      throw new Error(`Error updating cylinder: ${err.message}`);
    }
  }

  /**
   * Delete cylinder (soft delete)
   */
  async deleteCylinder(cylinderId, companyId, branchId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('cylinder_id', sql.Int, cylinderId)
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .output('error_message', sql.NVarChar(500))
        .execute('sp_DeleteCylinder');

      const errorMessage = result.output.error_message;
      return { message: errorMessage };
    } catch (err) {
      throw new Error(`Error deleting cylinder: ${err.message}`);
    }
  }

  /**
   * Get cylinder by code
   */
  async getCylinderByCode(cylinderCode, companyId, branchId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('cylinder_code', sql.NVarChar(50), cylinderCode)
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .execute('sp_GetCylinderByCode');

      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Error getting cylinder by code: ${err.message}`);
    }
  }

  /**
   * Get cylinder by serial number
   */
  async getCylinderBySerialNumber(serialNumber, companyId, branchId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('serial_number', sql.NVarChar(100), serialNumber)
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .execute('sp_GetCylinderBySerialNumber');

      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Error getting cylinder by serial number: ${err.message}`);
    }
  }

  /**
   * Get cylinder count by status
   */
  async getCylinderCountByStatus(companyId, branchId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .execute('sp_GetCylinderCountByStatus');

      return result.recordset;
    } catch (err) {
      throw new Error(`Error getting cylinder count: ${err.message}`);
    }
  }

  /**
   * Get cylinders due for test
   */
  async getCylindersDueForTest(companyId, branchId, daysAhead = 30) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('company_id', sql.Int, companyId)
        .input('branch_id', sql.Int, branchId)
        .input('days_ahead', sql.Int, daysAhead)
        .execute('sp_GetCylindersDueForTest');

      return result.recordset;
    } catch (err) {
      throw new Error(`Error getting cylinders due for test: ${err.message}`);
    }
  }

  /**
   * Create cylinder test record
   */
  async createCylinderTest(testData) {
    try {
      const pool = await getPool();
      // Transactional insert + cylinder date update (avoids dependency on SP signature)
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        // Validate cylinder belongs to company-branch
        const validate = await new sql.Request(tx)
          .input('cylinder_id', sql.Int, testData.cylinder_id)
          .input('company_id', sql.Int, testData.company_id)
          .input('branch_id', sql.Int, testData.branch_id)
          .query(`
            SELECT 1
            FROM cylinders
            WHERE id = @cylinder_id AND company_id = @company_id AND branch_id = @branch_id
          `);

        if (!validate.recordset || validate.recordset.length === 0) {
          const error = new Error('Cylinder not found for this company-branch');
          error.status = 404;
          throw error;
        }

        const insert = await new sql.Request(tx)
          .input('company_id', sql.Int, testData.company_id)
          .input('branch_id', sql.Int, testData.branch_id)
          .input('cylinder_id', sql.Int, testData.cylinder_id)
          .input('test_date', sql.Date, testData.test_date)
          .input('test_type', sql.NVarChar(50), testData.test_type || 'Hydrostatic')
          .input('test_pressure', sql.Decimal(10, 2), testData.test_pressure ?? null)
          .input('test_result', sql.NVarChar(20), testData.test_result || 'Pass')
          .input('inspector_name', sql.NVarChar(100), testData.inspector_name || null)
          .input('notes', sql.NVarChar(sql.MAX), testData.notes || null)
          .input('next_test_date', sql.Date, testData.next_test_date || null)
          .input('tested_by', sql.Int, testData.tested_by || null)
          .input('tare_weight', sql.Decimal(10, 2), testData.tare_weight ?? null)
          .input('reference_number', sql.NVarChar(100), testData.reference_number || null)
          .input('permission_number', sql.NVarChar(100), testData.permission_number || null)
          .input('permission_date', sql.Date, testData.permission_date || null)
          .input('water_filling_capacity', sql.Decimal(10, 2), testData.water_filling_capacity ?? null)
          .input('remarks', sql.NVarChar(sql.MAX), testData.remarks || null)
          .query(`
            INSERT INTO cylinder_tests (
              company_id, branch_id, cylinder_id,
              test_date, test_type, test_pressure, test_result,
              inspector_name, notes, next_test_date, tested_by, created_at,
              tare_weight, reference_number, permission_number, permission_date,
              water_filling_capacity, remarks
            )
            VALUES (
              @company_id, @branch_id, @cylinder_id,
              @test_date, @test_type, @test_pressure, @test_result,
              @inspector_name, @notes, @next_test_date, @tested_by, GETDATE(),
              @tare_weight, @reference_number, @permission_number, @permission_date,
              @water_filling_capacity, @remarks
            );
            SELECT SCOPE_IDENTITY() AS test_id;
          `);

        const testId = insert.recordset?.[0]?.test_id;
        if (!testId) {
          throw new Error('Failed to create cylinder test');
        }

        // Update cylinder's last/next test dates
        await new sql.Request(tx)
          .input('cylinder_id', sql.Int, testData.cylinder_id)
          .input('test_date', sql.Date, testData.test_date)
          .input('next_test_date', sql.Date, testData.next_test_date || null)
          .query(`
            UPDATE cylinders
            SET last_test_date = @test_date,
                next_test_date = @next_test_date,
                updated_at = GETDATE()
            WHERE id = @cylinder_id
          `);

        await tx.commit();
        return { test_id: testId, message: 'Cylinder test recorded successfully' };
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    } catch (err) {
      throw new Error(`Error creating cylinder test: ${err.message}`);
    }
  }

  /**
   * Get cylinder test history
   */
  async getCylinderTests(filters) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('company_id', sql.Int, filters.company_id)
        .input('branch_id', sql.Int, filters.branch_id ?? null)
        .input('cylinder_id', sql.Int, filters.cylinder_id ?? null)
        .input('test_type', sql.NVarChar(50), filters.test_type ?? null)
        .query(`
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
            ct.created_at,
            ct.tare_weight,
            ct.reference_number,
            ct.permission_number,
            ct.permission_date,
            ct.water_filling_capacity,
            ct.remarks
          FROM cylinder_tests ct
          INNER JOIN companies c ON ct.company_id = c.id
          INNER JOIN branches b ON ct.branch_id = b.id
          INNER JOIN cylinders cy ON ct.cylinder_id = cy.id
          LEFT JOIN users u ON ct.tested_by = u.id
          WHERE ct.company_id = @company_id
            AND (@branch_id IS NULL OR ct.branch_id = @branch_id)
            AND (@cylinder_id IS NULL OR ct.cylinder_id = @cylinder_id)
            AND (@test_type IS NULL OR ct.test_type = @test_type)
          ORDER BY ct.test_date DESC, ct.created_at DESC
        `);

      return result.recordset || [];
    } catch (err) {
      throw new Error(`Error getting cylinder tests: ${err.message}`);
    }
  }

  /**
   * Update a cylinder test record, then recalculate cylinder last/next dates
   */
  async updateCylinderTest(testData) {
    try {
      const pool = await getPool();
      const tx = new sql.Transaction(pool);
      await tx.begin();

      try {
        const existing = await new sql.Request(tx)
          .input('test_id', sql.Int, testData.test_id)
          .input('company_id', sql.Int, testData.company_id)
          .input('branch_id', sql.Int, testData.branch_id)
          .query(`
            SELECT id, cylinder_id
            FROM cylinder_tests
            WHERE id = @test_id AND company_id = @company_id AND branch_id = @branch_id
          `);

        if (!existing.recordset || existing.recordset.length === 0) {
          const error = new Error('Test record not found for this company-branch');
          error.status = 404;
          throw error;
        }

        const cylinderId = existing.recordset[0].cylinder_id;

        await new sql.Request(tx)
          .input('test_id', sql.Int, testData.test_id)
          .input('test_date', sql.Date, testData.test_date)
          .input('test_type', sql.NVarChar(50), testData.test_type || 'Hydrostatic')
          .input('test_pressure', sql.Decimal(10, 2), testData.test_pressure ?? null)
          .input('test_result', sql.NVarChar(20), testData.test_result)
          .input('inspector_name', sql.NVarChar(100), testData.inspector_name || null)
          .input('notes', sql.NVarChar(sql.MAX), testData.notes || null)
          .input('next_test_date', sql.Date, testData.next_test_date || null)
          .input('tested_by', sql.Int, testData.tested_by || null)
          .input('tare_weight', sql.Decimal(10, 2), testData.tare_weight ?? null)
          .input('reference_number', sql.NVarChar(100), testData.reference_number || null)
          .input('permission_number', sql.NVarChar(100), testData.permission_number || null)
          .input('permission_date', sql.Date, testData.permission_date || null)
          .input('water_filling_capacity', sql.Decimal(10, 2), testData.water_filling_capacity ?? null)
          .input('remarks', sql.NVarChar(sql.MAX), testData.remarks || null)
          .query(`
            UPDATE cylinder_tests
            SET test_date = @test_date,
                test_type = @test_type,
                test_pressure = @test_pressure,
                test_result = @test_result,
                inspector_name = @inspector_name,
                notes = @notes,
                next_test_date = @next_test_date,
                tested_by = @tested_by,
                tare_weight = @tare_weight,
                reference_number = @reference_number,
                permission_number = @permission_number,
                permission_date = @permission_date,
                water_filling_capacity = @water_filling_capacity,
                remarks = @remarks
            WHERE id = @test_id
          `);

        await this.recalcCylinderDates(tx, cylinderId);

        await tx.commit();
        return { message: 'Cylinder test updated successfully' };
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    } catch (err) {
      throw new Error(`Error updating cylinder test: ${err.message}`);
    }
  }

  /**
   * Delete a cylinder test record, then recalculate cylinder last/next dates
   */
  async deleteCylinderTest(filters) {
    try {
      const pool = await getPool();
      const tx = new sql.Transaction(pool);
      await tx.begin();

      try {
        const existing = await new sql.Request(tx)
          .input('test_id', sql.Int, filters.test_id)
          .input('company_id', sql.Int, filters.company_id)
          .input('branch_id', sql.Int, filters.branch_id)
          .query(`
            SELECT id, cylinder_id
            FROM cylinder_tests
            WHERE id = @test_id AND company_id = @company_id AND branch_id = @branch_id
          `);

        if (!existing.recordset || existing.recordset.length === 0) {
          const error = new Error('Test record not found for this company-branch');
          error.status = 404;
          throw error;
        }

        const cylinderId = existing.recordset[0].cylinder_id;

        await new sql.Request(tx)
          .input('test_id', sql.Int, filters.test_id)
          .query(`DELETE FROM cylinder_tests WHERE id = @test_id`);

        await this.recalcCylinderDates(tx, cylinderId);

        await tx.commit();
        return { message: 'Cylinder test deleted successfully' };
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    } catch (err) {
      throw new Error(`Error deleting cylinder test: ${err.message}`);
    }
  }

  async recalcCylinderDates(tx, cylinderId) {
    const latest = await new sql.Request(tx)
      .input('cylinder_id', sql.Int, cylinderId)
      .query(`
        SELECT TOP 1 test_date, next_test_date
        FROM cylinder_tests
        WHERE cylinder_id = @cylinder_id
        ORDER BY test_date DESC, created_at DESC
      `);

    const last_test_date = latest.recordset?.[0]?.test_date ?? null;
    const next_test_date = latest.recordset?.[0]?.next_test_date ?? null;

    await new sql.Request(tx)
      .input('cylinder_id', sql.Int, cylinderId)
      .input('last_test_date', sql.Date, last_test_date)
      .input('next_test_date', sql.Date, next_test_date)
      .query(`
        UPDATE cylinders
        SET last_test_date = @last_test_date,
            next_test_date = @next_test_date,
            updated_at = GETDATE()
        WHERE id = @cylinder_id
      `);
  }

  /**
   * Update cylinder test record
   */
  async updateCylinderTest(testData) {
    try {
      const pool = await getPool();
      const tx = new sql.Transaction(pool);
      await tx.begin();

      try {
        const existing = await new sql.Request(tx)
          .input('test_id', sql.Int, testData.test_id)
          .input('company_id', sql.Int, testData.company_id)
          .input('branch_id', sql.Int, testData.branch_id)
          .query(`
            SELECT id, cylinder_id
            FROM cylinder_tests
            WHERE id = @test_id AND company_id = @company_id AND branch_id = @branch_id
          `);

        if (!existing.recordset || existing.recordset.length === 0) {
          const error = new Error('Test record not found for this company-branch');
          error.status = 404;
          throw error;
        }

        const cylinderId = existing.recordset[0].cylinder_id;

        await new sql.Request(tx)
          .input('test_id', sql.Int, testData.test_id)
          .input('test_date', sql.Date, testData.test_date)
          .input('test_type', sql.NVarChar(50), testData.test_type || 'Hydrostatic')
          .input('test_pressure', sql.Decimal(10, 2), testData.test_pressure ?? null)
          .input('test_result', sql.NVarChar(20), testData.test_result)
          .input('inspector_name', sql.NVarChar(100), testData.inspector_name || null)
          .input('notes', sql.NVarChar(sql.MAX), testData.notes || null)
          .input('next_test_date', sql.Date, testData.next_test_date || null)
          .input('tested_by', sql.Int, testData.tested_by || null)
          .input('tare_weight', sql.Decimal(10, 2), testData.tare_weight ?? null)
          .input('reference_number', sql.NVarChar(100), testData.reference_number || null)
          .input('permission_number', sql.NVarChar(100), testData.permission_number || null)
          .input('permission_date', sql.Date, testData.permission_date || null)
          .input('water_filling_capacity', sql.Decimal(10, 2), testData.water_filling_capacity ?? null)
          .input('remarks', sql.NVarChar(sql.MAX), testData.remarks || null)
          .query(`
            UPDATE cylinder_tests
            SET test_date = @test_date,
                test_type = @test_type,
                test_pressure = @test_pressure,
                test_result = @test_result,
                inspector_name = @inspector_name,
                notes = @notes,
                next_test_date = @next_test_date,
                tested_by = @tested_by,
                tare_weight = @tare_weight,
                reference_number = @reference_number,
                permission_number = @permission_number,
                permission_date = @permission_date,
                water_filling_capacity = @water_filling_capacity,
                remarks = @remarks
            WHERE id = @test_id
          `);

        await this.recalcCylinderDates(tx, cylinderId);

        await tx.commit();
        return { message: 'Cylinder test updated successfully' };
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    } catch (err) {
      if (err.status) throw err;
      throw new Error(`Error updating cylinder test: ${err.message}`);
    }
  }

  /**
   * Delete cylinder test record
   */
  async deleteCylinderTest(filters) {
    try {
      const pool = await getPool();
      const tx = new sql.Transaction(pool);
      await tx.begin();

      try {
        const existing = await new sql.Request(tx)
          .input('test_id', sql.Int, filters.test_id)
          .input('company_id', sql.Int, filters.company_id)
          .input('branch_id', sql.Int, filters.branch_id)
          .query(`
            SELECT id, cylinder_id
            FROM cylinder_tests
            WHERE id = @test_id AND company_id = @company_id AND branch_id = @branch_id
          `);

        if (!existing.recordset || existing.recordset.length === 0) {
          const error = new Error('Test record not found for this company-branch');
          error.status = 404;
          throw error;
        }

        const cylinderId = existing.recordset[0].cylinder_id;

        await new sql.Request(tx)
          .input('test_id', sql.Int, filters.test_id)
          .query(`DELETE FROM cylinder_tests WHERE id = @test_id`);

        await this.recalcCylinderDates(tx, cylinderId);

        await tx.commit();
        return { message: 'Cylinder test deleted successfully' };
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    } catch (err) {
      if (err.status) throw err;
      throw new Error(`Error deleting cylinder test: ${err.message}`);
    }
  }

  /**
   * Get cylinder by barcode number (PUBLIC - no auth required)
   * Used for QR code scanning - returns full cylinder details with latest test info
   */
  async getCylinderByBarcode(barcodeNumber) {
    try {
      const pool = await getPool();
      
      // Get cylinder details with company and branch info
      const cylinderResult = await pool.request()
        .input('barcode_number', sql.NVarChar(100), barcodeNumber)
        .query(`
          SELECT 
            c.id as cylinder_id,
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
            c.created_at,
            co.company_name,
            b.branch_name
          FROM cylinders c
          JOIN companies co ON c.company_id = co.id
          JOIN branches b ON c.branch_id = b.id
          WHERE c.barcode_number = @barcode_number
            AND c.is_active = 1
        `);

      if (!cylinderResult.recordset || cylinderResult.recordset.length === 0) {
        return null;
      }

      const cylinder = cylinderResult.recordset[0];

      // Get latest test record for this cylinder
      const testResult = await pool.request()
        .input('cylinder_id', sql.Int, cylinder.cylinder_id)
        .query(`
          SELECT TOP 1
            ct.id as test_id,
            ct.test_date,
            ct.test_type,
            ct.test_pressure,
            ct.test_result,
            ct.inspector_name,
            ct.notes,
            ct.next_test_date,
            ct.created_at as test_created_at
          FROM cylinder_tests ct
          WHERE ct.cylinder_id = @cylinder_id
          ORDER BY ct.test_date DESC, ct.created_at DESC
        `);

      const latestTest = testResult.recordset[0] || null;

      return {
        cylinder,
        latestTest
      };
    } catch (err) {
      throw new Error(`Error getting cylinder by barcode: ${err.message}`);
    }
  }
}

module.exports = new CylinderRepository();

