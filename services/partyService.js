const partyRepository = require('../repositories/partyRepository');

class PartyService {
  async listParties(params) {
    const { company_id, branch_id } = params;
    if (!company_id || !branch_id) {
      const error = new Error('Company ID and Branch ID are required');
      error.status = 400;
      throw error;
    }

    return partyRepository.listParties(params);
  }

  async getPartyDetails(scope) {
    if (!scope.company_id || !scope.branch_id || !scope.party_id) {
      const error = new Error('company_id, branch_id and party_id are required');
      error.status = 400;
      throw error;
    }

    return partyRepository.getPartyDetails(scope);
  }

  async createPartyFull({ company_id, branch_id, created_by, party, addresses, contacts }) {
    if (!company_id || !branch_id) {
      const error = new Error('Company ID and Branch ID are required');
      error.status = 400;
      throw error;
    }

    if (!party?.cust_code || !party?.cust_name) {
      const error = new Error('cust_code and cust_name are required (or party_code and party_name)');
      error.status = 400;
      throw error;
    }

    return partyRepository.createPartyFull({
      company_id,
      branch_id,
      created_by,
      party,
      addresses: addresses || [],
      contacts: contacts || []
    });
  }

  async updatePartyFull({ company_id, branch_id, party_id, modified_by, party, addresses, contacts }) {
    if (!company_id || !branch_id || !party_id) {
      const error = new Error('Company ID and Branch ID are required');
      error.status = 400;
      throw error;
    }

    if (!party) {
      const error = new Error('party object is required');
      error.status = 400;
      throw error;
    }

    return partyRepository.updatePartyFull({
      company_id,
      branch_id,
      party_id,
      modified_by,
      party,
      addresses: addresses || [],
      contacts: contacts || []
    });
  }

  async deleteParty(scope) {
    if (!scope.company_id || !scope.branch_id || !scope.party_id) {
      const error = new Error('company_id, branch_id and party_id are required');
      error.status = 400;
      throw error;
    }
    return partyRepository.softDeleteParty(scope);
  }
}

module.exports = new PartyService();


