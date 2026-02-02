const cylinderRepository = require('../repositories/cylinderRepository');

class CylinderService {
  normalizeOwnerType(ownerType) {
    if (ownerType === null || ownerType === undefined) return null;
    const v = String(ownerType).trim().toUpperCase();
    if (!v) return null;
    return v;
  }

  normalizeIntOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Create a new cylinder
   */
  async createCylinder(cylinderData) {
    try {
      // Validate required fields
      if (!cylinderData.company_id || !cylinderData.branch_id || !cylinderData.cylinder_code) {
        const error = new Error('Company ID, Branch ID, and Cylinder Code are required');
        error.status = 400;
        throw error;
      }

      const fam = cylinderData.cylinder_family_code !== undefined && cylinderData.cylinder_family_code !== null
        ? String(cylinderData.cylinder_family_code).trim()
        : '';
      if (!fam) {
        const error = new Error('cylinder_family_code is required');
        error.status = 400;
        throw error;
      }
      cylinderData.cylinder_family_code = fam;

      const ownerType = this.normalizeOwnerType(cylinderData.owner_type);
      if (!ownerType) {
        const error = new Error('owner_type is required (SELF or PARTY)');
        error.status = 400;
        throw error;
      }
      if (ownerType !== 'SELF' && ownerType !== 'PARTY') {
        const error = new Error("Invalid owner_type. Allowed values: 'SELF', 'PARTY'");
        error.status = 400;
        throw error;
      }
      cylinderData.owner_type = ownerType;

      const ownerPartyId = this.normalizeIntOrNull(cylinderData.owner_party_id);
      if (ownerType === 'PARTY' && !ownerPartyId) {
        const error = new Error('owner_party_id is required when owner_type is PARTY');
        error.status = 400;
        throw error;
      }
      // If SELF, force these to null to avoid accidental linkage
      cylinderData.owner_party_id = ownerType === 'PARTY' ? ownerPartyId : null;
      if (ownerType === 'SELF') {
        cylinderData.current_holder_party_id = null;
      }

      // Create cylinder (and test record if test data provided)
      const result = await cylinderRepository.createCylinder(cylinderData);

      return {
        cylinder_id: result.cylinder_id,
        test_id: result.test_id || null,
        message: result.test_id 
          ? 'Cylinder and test record created successfully' 
          : 'Cylinder created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cylinder by ID
   */
  async getCylinderById(cylinderId, companyId, branchId) {
    try {
      const cylinder = await cylinderRepository.getCylinderById(cylinderId, companyId, branchId);

      if (!cylinder) {
        const error = new Error('Cylinder not found');
        error.status = 404;
        throw error;
      }

      return cylinder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all cylinders with pagination and filters
   * Returns: { data: [...], totalCount: number }
   */
  async getCylinders(filters) {
    try {
      if (!filters.company_id || !filters.branch_id) {
        const error = new Error('Company ID and Branch ID are required');
        error.status = 400;
        throw error;
      }

      const result = await cylinderRepository.getCylindersByCompanyBranch(filters);
      return result; // { data: [...], totalCount: number }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update cylinder
   */
  async updateCylinder(cylinderId, companyId, branchId, updateData) {
    try {
      // Check if cylinder exists
      const existingCylinder = await cylinderRepository.getCylinderById(cylinderId, companyId, branchId);
      if (!existingCylinder) {
        const error = new Error('Cylinder not found');
        error.status = 404;
        throw error;
      }

      // Determine "final" owner_type after update (use existing if not provided)
      const incomingOwnerType = updateData.owner_type !== undefined ? this.normalizeOwnerType(updateData.owner_type) : undefined;
      const finalOwnerType = incomingOwnerType !== undefined ? incomingOwnerType : this.normalizeOwnerType(existingCylinder.owner_type);

      if (!finalOwnerType) {
        const error = new Error('owner_type is required (SELF or PARTY)');
        error.status = 400;
        throw error;
      }
      if (finalOwnerType !== 'SELF' && finalOwnerType !== 'PARTY') {
        const error = new Error("Invalid owner_type. Allowed values: 'SELF', 'PARTY'");
        error.status = 400;
        throw error;
      }

      // Determine "final" owner_party_id after update:
      // - if explicitly provided in body, use it
      // - otherwise use existing
      const incomingOwnerPartyId =
        updateData.owner_party_id !== undefined ? this.normalizeIntOrNull(updateData.owner_party_id) : undefined;
      const existingOwnerPartyId = this.normalizeIntOrNull(existingCylinder.owner_party_id);
      const finalOwnerPartyId = incomingOwnerPartyId !== undefined ? incomingOwnerPartyId : existingOwnerPartyId;

      if (finalOwnerType === 'PARTY' && !finalOwnerPartyId) {
        const error = new Error('owner_party_id is required when owner_type is PARTY');
        error.status = 400;
        throw error;
      }

      // Apply normalized values back to updateData
      if (incomingOwnerType !== undefined) updateData.owner_type = finalOwnerType;
      // If switching to SELF, clear party linkage (SP must support clearing on owner_type change; we also clear in updateData)
      if (incomingOwnerType === 'SELF') {
        updateData.owner_party_id = null;
        updateData.current_holder_party_id = null;
      } else if (incomingOwnerPartyId !== undefined) {
        updateData.owner_party_id = finalOwnerPartyId;
      }

      // Update cylinder
      const result = await cylinderRepository.updateCylinder(cylinderId, companyId, branchId, updateData);

      return {
        message: 'Cylinder updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete cylinder
   */
  async deleteCylinder(cylinderId, companyId, branchId) {
    try {
      // Check if cylinder exists
      const existingCylinder = await cylinderRepository.getCylinderById(cylinderId, companyId, branchId);
      if (!existingCylinder) {
        const error = new Error('Cylinder not found');
        error.status = 404;
        throw error;
      }

      // Delete cylinder
      const result = await cylinderRepository.deleteCylinder(cylinderId, companyId, branchId);

      return {
        message: 'Cylinder deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cylinder by code
   */
  async getCylinderByCode(cylinderCode, companyId, branchId) {
    try {
      const cylinder = await cylinderRepository.getCylinderByCode(cylinderCode, companyId, branchId);

      if (!cylinder) {
        const error = new Error('Cylinder not found');
        error.status = 404;
        throw error;
      }

      return cylinder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cylinder by serial number
   */
  async getCylinderBySerialNumber(serialNumber, companyId, branchId) {
    try {
      const cylinder = await cylinderRepository.getCylinderBySerialNumber(serialNumber, companyId, branchId);

      if (!cylinder) {
        const error = new Error('Cylinder not found');
        error.status = 404;
        throw error;
      }

      return cylinder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cylinder statistics by status
   */
  async getCylinderStats(companyId, branchId) {
    try {
      const stats = await cylinderRepository.getCylinderCountByStatus(companyId, branchId);
      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cylinders due for testing
   */
  async getCylindersDueForTest(companyId, branchId, daysAhead = 30) {
    try {
      const cylinders = await cylinderRepository.getCylindersDueForTest(companyId, branchId, daysAhead);
      return cylinders;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get testing history for a cylinder
   */
  async getCylinderTests(filters) {
    try {
      if (!filters.company_id) {
        const error = new Error('Company ID is required');
        error.status = 400;
        throw error;
      }
      if (!filters.cylinder_id) {
        const error = new Error('Cylinder ID is required');
        error.status = 400;
        throw error;
      }

      return await cylinderRepository.getCylinderTests(filters);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add a new testing record for a cylinder
   */
  async addCylinderTest(testData) {
    try {
      if (!testData.company_id || !testData.branch_id || !testData.cylinder_id) {
        const error = new Error('Company ID, Branch ID and Cylinder ID are required');
        error.status = 400;
        throw error;
      }
      if (!testData.test_date) {
        const error = new Error('test_date is required');
        error.status = 400;
        throw error;
      }

      const result = await cylinderRepository.createCylinderTest(testData);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk upload cylinders from CSV data
   * @param {Array} cylindersData - Array of cylinder objects from CSV
   * @param {number} companyId - Company ID
   * @param {number} branchId - Branch ID
   * @param {number} createdBy - User ID who is uploading
   * @returns {Object} Upload results with success/failure counts
   */
  async bulkUploadCylinders(cylindersData, companyId, branchId, createdBy) {
    try {
      const results = {
        total: cylindersData.length,
        inserted: 0,
        failed: 0,
        errors: [],
        insertedRecords: []
      };

      // Validate createdBy user exists (set to null if invalid to avoid FK constraint errors)
      let validCreatedBy = null;
      if (createdBy) {
        try {
          const userRepository = require('../repositories/userRepository');
          const user = await userRepository.findById(createdBy);
          validCreatedBy = user ? createdBy : null;
        } catch (e) {
          console.warn('Could not validate created_by user, setting to null');
          validCreatedBy = null;
        }
      }

      for (let i = 0; i < cylindersData.length; i++) {
        const row = cylindersData[i];
        const rowNumber = i + 2; // +2 because row 1 is header

        try {
          // Skip empty rows
          if (!row.cylinder_code && !row.cylinder_family_code) {
            continue;
          }

          // Prepare cylinder data (matching sp_CreateCylinder parameters)
          const cylinderData = {
            company_id: companyId,
            branch_id: branchId,
            cylinder_code: row.cylinder_code?.trim(),
            serial_number: row.serial_number?.trim() || null,
            cylinder_family_code: row.cylinder_family_code?.trim() || null,
            owner_type: row.owner_type?.trim() || null,
            owner_party_id: row.owner_party_id?.trim() || null,
            barcode_number: row.barcode_number?.trim() || null,
            cylinder_type: row.cylinder_type?.trim() || null,
            capacity: row.capacity ? parseFloat(row.capacity) : null,
            capacity_unit: row.capacity_unit?.trim() || null,
            manufacturer: row.manufacturer?.trim() || null,
            manufacture_date: row.manufacture_date ? this.parseDate(row.manufacture_date) : null,
            last_test_date: row.last_test_date ? this.parseDate(row.last_test_date) : null,
            next_test_date: row.next_test_date ? this.parseDate(row.next_test_date) : null,
            status: row.status?.trim()?.toLowerCase() || 'available',
            created_by: validCreatedBy,
            
            // Test data for cylinder_tests table (matching sp_CreateCylinderTest parameters)
            test_date: row.last_test_date ? this.parseDate(row.last_test_date) : null,
            test_type: row.test_type?.trim() || null,
            test_pressure: row.test_pressure ? parseFloat(row.test_pressure) : null,
            test_result: row.test_result?.trim() || null,
            inspector_name: row.inspector_name?.trim() || null,
            test_notes: row.test_remarks?.trim() || null,
            tested_by: validCreatedBy
          };

          // Validate required fields
          if (!cylinderData.cylinder_code || !cylinderData.cylinder_family_code) {
            throw new Error('cylinder_code and cylinder_family_code are required');
          }

          const ot = this.normalizeOwnerType(cylinderData.owner_type);
          if (!ot || (ot !== 'SELF' && ot !== 'PARTY')) {
            throw new Error("owner_type is required and must be SELF or PARTY");
          }
          cylinderData.owner_type = ot;
          const op = this.normalizeIntOrNull(cylinderData.owner_party_id);
          if (ot === 'PARTY' && !op) {
            throw new Error('owner_party_id is required when owner_type is PARTY');
          }
          cylinderData.owner_party_id = ot === 'PARTY' ? op : null;

          // Create cylinder (and test record if test data provided)
          const result = await cylinderRepository.createCylinder(cylinderData);
          
          results.inserted++;
          results.insertedRecords.push({
            cylinder_id: result.cylinder_id,
            cylinder_code: cylinderData.cylinder_code,
            test_id: result.test_id || null
          });

        } catch (error) {
          console.error(`❌ Row ${rowNumber} failed:`, error.message);
          results.failed++;
          results.errors.push({
            row: rowNumber,
            cylinder_code: row.cylinder_code || 'N/A',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse date string to SQL format
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  }
}

module.exports = new CylinderService();

