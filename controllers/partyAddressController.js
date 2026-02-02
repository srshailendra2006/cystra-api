const partyAddressService = require('../services/partyAddressService');

function toInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function enforceScope(req, company_id, branch_id) {
  const tokenCompany = req.user?.company_id ?? null;
  const tokenBranch = req.user?.branch_id ?? null;
  const permission = req.user?.permission_level ?? 10;

  if (tokenCompany && company_id && tokenCompany !== company_id && permission < 100) {
    const err = new Error('Forbidden (cross-company access not allowed)');
    err.status = 403;
    throw err;
  }

  if (tokenBranch && branch_id && tokenBranch !== branch_id && permission < 50) {
    const err = new Error('Forbidden (cross-branch access not allowed)');
    err.status = 403;
    throw err;
  }
}

class PartyAddressController {
  async listByParty(req, res) {
    try {
      const company_id = toInt(req.query.company_id) ?? req.user?.company_id;
      const branch_id = toInt(req.query.branch_id) ?? req.user?.branch_id;
      const party_id = toInt(req.params.partyId);

      enforceScope(req, company_id, branch_id);

      const addresses = await partyAddressService.listByParty({ company_id, branch_id, party_id });
      return res.status(200).json({ status: 'success', data: addresses });
    } catch (error) {
      console.error('List party addresses error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to list party addresses'
      });
    }
  }

  async createForParty(req, res) {
    try {
      const company_id = toInt(req.body.company_id) ?? req.user?.company_id;
      const branch_id = toInt(req.body.branch_id) ?? req.user?.branch_id;
      const party_id = toInt(req.params.partyId);

      enforceScope(req, company_id, branch_id);

      const address = req.body.address || {
        address_type: req.body.address_type,
        address1: req.body.address1,
        address2: req.body.address2,
        address3: req.body.address3,
        city_id: req.body.city_id,
        state_id: req.body.state_id,
        country_id: req.body.country_id,
        pincode: req.body.pincode,
        is_default: req.body.is_default
      };

      const result = await partyAddressService.create({ company_id, branch_id, party_id, address });
      return res.status(201).json({
        status: 'success',
        message: 'Address created successfully',
        data: result
      });
    } catch (error) {
      console.error('Create party address error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to create address'
      });
    }
  }

  async updateById(req, res) {
    try {
      const company_id = toInt(req.body.company_id) ?? req.user?.company_id;
      const branch_id = toInt(req.body.branch_id) ?? req.user?.branch_id;
      const address_id = toInt(req.params.addressId);

      enforceScope(req, company_id, branch_id);

      const address = req.body.address || req.body;
      const result = await partyAddressService.update({ company_id, branch_id, address_id, address });
      return res.status(200).json({ status: 'success', message: 'Address updated successfully', data: result });
    } catch (error) {
      console.error('Update party address error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to update address'
      });
    }
  }

  async softDeleteById(req, res) {
    try {
      const company_id = toInt(req.query.company_id) ?? req.user?.company_id;
      const branch_id = toInt(req.query.branch_id) ?? req.user?.branch_id;
      const address_id = toInt(req.params.addressId);

      enforceScope(req, company_id, branch_id);

      const result = await partyAddressService.softDelete({ company_id, branch_id, address_id });
      return res.status(200).json({ status: 'success', message: 'Address deleted successfully', data: result });
    } catch (error) {
      console.error('Delete party address error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        message: error.message || 'Failed to delete address'
      });
    }
  }
}

module.exports = new PartyAddressController();


