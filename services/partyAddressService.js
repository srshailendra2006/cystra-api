const partyAddressRepository = require('../repositories/partyAddressRepository');

class PartyAddressService {
  async listByParty({ company_id, branch_id, party_id }) {
    if (!company_id || !branch_id || !party_id) {
      const err = new Error('company_id, branch_id and party_id are required');
      err.status = 400;
      throw err;
    }
    return partyAddressRepository.listByParty({ company_id, branch_id, party_id });
  }

  async create({ company_id, branch_id, party_id, address }) {
    if (!company_id || !branch_id || !party_id) {
      const err = new Error('company_id, branch_id and party_id are required');
      err.status = 400;
      throw err;
    }
    if (!address?.address_type || !address?.address1) {
      const err = new Error('address_type and address1 are required');
      err.status = 400;
      throw err;
    }
    return partyAddressRepository.create({ company_id, branch_id, party_id, address });
  }

  async update({ company_id, branch_id, address_id, address }) {
    if (!company_id || !branch_id || !address_id) {
      const err = new Error('company_id, branch_id and address_id are required');
      err.status = 400;
      throw err;
    }
    if (!address || typeof address !== 'object') {
      const err = new Error('address object is required');
      err.status = 400;
      throw err;
    }
    return partyAddressRepository.update({ company_id, branch_id, address_id, address });
  }

  async softDelete({ company_id, branch_id, address_id }) {
    if (!company_id || !branch_id || !address_id) {
      const err = new Error('company_id, branch_id and address_id are required');
      err.status = 400;
      throw err;
    }
    return partyAddressRepository.softDelete({ company_id, branch_id, address_id });
  }
}

module.exports = new PartyAddressService();


