# 🔧 Cylinder API Documentation

## Overview
Complete REST API for Cylinder CRUD operations with Company-Branch multi-tenant architecture.

**Base URL:** `http://localhost:8081/api/v1/cylinders`

---

## 📋 API Endpoints

### 1. Create Cylinder
**POST** `/api/v1/cylinders`

Create a new cylinder for a specific company and branch.

**Required fields (minimum):**
- `company_id`
- `branch_id`
- `cylinder_code`
- `cylinder_family_code` ✅ (mandatory)
- `owner_type` ✅ (SELF | PARTY)

**Optional fields:**
- `serial_number` (optional / can be null)

**Request Body:**
```json
{
  "company_id": 1,
  "branch_id": 1,
  "cylinder_code": "CYL-001",
  "serial_number": null,
  "cylinder_family_code": "FAM-01",
  "owner_type": "SELF",
  "cylinder_type": "Oxygen",
  "capacity": 50.00,
  "capacity_unit": "Liters",
  "manufacturer": "XYZ Corp",
  "manufacture_date": "2023-01-15",
  "last_test_date": "2024-06-01",
  "next_test_date": "2025-06-01",
  "status": "available",
  "created_by": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Cylinder created successfully",
  "data": {
    "cylinder_id": 1
  }
}
```

---

### 2. Get All Cylinders (with Pagination & Filters)
**GET** `/api/v1/cylinders?company_id=1&branch_id=1&page=1&limit=10&search=oxygen&status=available`

Get list of cylinders with optional filters.

**Query Parameters:**
- `company_id` (required): Company ID
- `branch_id` (required): Branch ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term (searches code, serial, type, manufacturer)
- `status` (optional): Filter by status (available, in_use, testing, maintenance, retired)
- `is_active` (optional): Filter by active status (true/false)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "company_name": "Cystra Industries",
      "branch_id": 1,
      "branch_name": "Main Branch - NYC",
      "cylinder_code": "CYL-001",
      "serial_number": null,
      "cylinder_family_code": "FAM-01",
      "owner_type": "SELF",
      "cylinder_type": "Oxygen",
      "capacity": 50.00,
      "capacity_unit": "Liters",
      "manufacturer": "XYZ Corp",
      "manufacture_date": "2023-01-15",
      "last_test_date": "2024-06-01",
      "next_test_date": "2025-06-01",
      "status": "available",
      "is_active": true,
      "created_by": 1,
      "created_by_username": "johndoe",
      "created_at": "2024-11-24T10:00:00.000Z",
      "updated_at": "2024-11-24T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

---

### 3. Get Cylinder by ID
**GET** `/api/v1/cylinders/:id?company_id=1&branch_id=1`

Get a specific cylinder by its ID.

**Query Parameters:**
- `company_id` (required): Company ID
- `branch_id` (required): Branch ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "company_id": 1,
    "company_name": "Cystra Industries",
    "branch_id": 1,
    "branch_name": "Main Branch - NYC",
    "cylinder_code": "CYL-001",
    "serial_number": null,
    "cylinder_family_code": "FAM-01",
    "owner_type": "SELF",
    "cylinder_type": "Oxygen",
    "capacity": 50.00,
    "capacity_unit": "Liters",
    "manufacturer": "XYZ Corp",
    "status": "available",
    "created_at": "2024-11-24T10:00:00.000Z"
  }
}
```

---

### 4. Get Cylinder by Code
**GET** `/api/v1/cylinders/code/:code?company_id=1&branch_id=1`

Find a cylinder by its cylinder code.

**Example:** `/api/v1/cylinders/code/CYL-001?company_id=1&branch_id=1`

---

### 5. Get Cylinder by Serial Number
**GET** `/api/v1/cylinders/serial/:serial?company_id=1&branch_id=1`

Find a cylinder by its serial number.

**Example:** `/api/v1/cylinders/serial/SN123456789?company_id=1&branch_id=1`

---

### 6. Update Cylinder
**PUT** `/api/v1/cylinders/:id?company_id=1&branch_id=1`

Update an existing cylinder (partial update supported).

**Request Body (only include fields to update):**
```json
{
  "status": "in_use",
  "last_test_date": "2024-11-20",
  "next_test_date": "2025-11-20"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Cylinder updated successfully"
}
```

---

### 7. Delete Cylinder
**DELETE** `/api/v1/cylinders/:id?company_id=1&branch_id=1`

Soft delete a cylinder (sets is_active to false).

**Response:**
```json
{
  "status": "success",
  "message": "Cylinder deleted successfully"
}
```

---

### 8. Get Cylinder Statistics
**GET** `/api/v1/cylinders/stats?company_id=1&branch_id=1`

Get count of cylinders grouped by status (for dashboard).

**Response:**
```json
{
  "status": "success",
  "data": [
    { "status": "available", "count": 25 },
    { "status": "in_use", "count": 15 },
    { "status": "testing", "count": 3 },
    { "status": "maintenance", "count": 2 }
  ]
}
```

---

### 9. Get Cylinders Due for Test
**GET** `/api/v1/cylinders/due-for-test?company_id=1&branch_id=1&days=30`

Get cylinders that need testing within specified days.

**Query Parameters:**
- `company_id` (required): Company ID
- `branch_id` (required): Branch ID
- `days` (optional): Days ahead to check (default: 30)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "cylinder_code": "CYL-001",
      "serial_number": "SN123456789",
      "next_test_date": "2024-12-15",
      "days_until_due": 20
    }
  ]
}
```

---

## 🔒 Security Features

- ✅ **Company-Branch Isolation**: All endpoints require company_id and branch_id
- ✅ **Validation**:
  - Duplicate `cylinder_code` prevented
  - Duplicate `serial_number` prevented **only when serial_number is provided** (serial_number can be NULL)
  - `cylinder_family_code` is mandatory
- ✅ **Soft Delete**: Data is preserved for history
- ✅ **Audit Trail**: created_by, created_at, updated_at tracked

---

## 📥 Bulk Upload (CSV) - Required Headers

**Minimum required columns in CSV:**
- `cylinder_code`
- `cylinder_family_code`
- `owner_type` (SELF or PARTY)
- `owner_party_id` (**required only when owner_type is PARTY**)

**Optional columns:**
- `serial_number` (optional; can be blank)
- `barcode_number`, `cylinder_type`, `capacity`, `capacity_unit`, `manufacturer`, `manufacture_date`, `status`, etc.

**Example CSV header row:**
```csv
cylinder_code,cylinder_family_code,owner_type,owner_party_id,serial_number,barcode_number,cylinder_type,capacity,capacity_unit,manufacturer,manufacture_date,status
```

---

## ⚛️ React Integration Examples

### Setup API Service

```javascript
// src/services/cylinderApi.js
const API_BASE_URL = 'http://localhost:8081/api/v1';

export const cylinderAPI = {
  // Create Cylinder
  createCylinder: async (cylinderData) => {
    const response = await fetch(`${API_BASE_URL}/cylinders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(cylinderData)
    });
    return response.json();
  },

  // Get All Cylinders
  getCylinders: async (companyId, branchId, filters = {}) => {
    const params = new URLSearchParams({
      company_id: companyId,
      branch_id: branchId,
      page: filters.page || 1,
      limit: filters.limit || 10,
      ...(filters.search && { search: filters.search }),
      ...(filters.status && { status: filters.status })
    });

    const response = await fetch(`${API_BASE_URL}/cylinders?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.json();
  },

  // Get Cylinder by ID
  getCylinderById: async (id, companyId, branchId) => {
    const response = await fetch(
      `${API_BASE_URL}/cylinders/${id}?company_id=${companyId}&branch_id=${branchId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.json();
  },

  // Update Cylinder
  updateCylinder: async (id, companyId, branchId, updateData) => {
    const response = await fetch(
      `${API_BASE_URL}/cylinders/${id}?company_id=${companyId}&branch_id=${branchId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      }
    );
    return response.json();
  },

  // Delete Cylinder
  deleteCylinder: async (id, companyId, branchId) => {
    const response = await fetch(
      `${API_BASE_URL}/cylinders/${id}?company_id=${companyId}&branch_id=${branchId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.json();
  },

  // Get Statistics
  getStats: async (companyId, branchId) => {
    const response = await fetch(
      `${API_BASE_URL}/cylinders/stats?company_id=${companyId}&branch_id=${branchId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.json();
  },

  // Get Cylinders Due for Test
  getDueForTest: async (companyId, branchId, days = 30) => {
    const response = await fetch(
      `${API_BASE_URL}/cylinders/due-for-test?company_id=${companyId}&branch_id=${branchId}&days=${days}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.json();
  }
};
```

### React Component Example - Cylinder List

```javascript
// src/components/CylinderList.jsx
import React, { useState, useEffect } from 'react';
import { cylinderAPI } from '../services/cylinderApi';

function CylinderList() {
  const [cylinders, setCylinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const companyId = 1; // Get from auth context
  const branchId = 1;  // Get from auth context

  useEffect(() => {
    fetchCylinders();
  }, [page, search, statusFilter]);

  const fetchCylinders = async () => {
    setLoading(true);
    try {
      const result = await cylinderAPI.getCylinders(companyId, branchId, {
        page,
        limit: 10,
        search,
        status: statusFilter
      });
      
      if (result.status === 'success') {
        setCylinders(result.data);
      }
    } catch (error) {
      console.error('Error fetching cylinders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cylinder-list">
      <h2>Cylinders</h2>
      
      {/* Search & Filter */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search cylinders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
          <option value="testing">Testing</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Cylinder Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Serial Number</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Next Test</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cylinders.map((cylinder) => (
              <tr key={cylinder.id}>
                <td>{cylinder.cylinder_code}</td>
                <td>{cylinder.serial_number}</td>
                <td>{cylinder.cylinder_type}</td>
                <td>{cylinder.capacity} {cylinder.capacity_unit}</td>
                <td><span className={`status-${cylinder.status}`}>{cylinder.status}</span></td>
                <td>{new Date(cylinder.next_test_date).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleEdit(cylinder.id)}>Edit</button>
                  <button onClick={() => handleDelete(cylinder.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}

export default CylinderList;
```

### React Component Example - Create Cylinder Form

```javascript
// src/components/CreateCylinder.jsx
import React, { useState } from 'react';
import { cylinderAPI } from '../services/cylinderApi';

function CreateCylinder({ companyId, branchId, onSuccess }) {
  const [formData, setFormData] = useState({
    cylinder_code: '',
    serial_number: '',
    cylinder_type: '',
    capacity: '',
    capacity_unit: 'Liters',
    manufacturer: '',
    manufacture_date: '',
    status: 'available'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const result = await cylinderAPI.createCylinder({
        company_id: companyId,
        branch_id: branchId,
        ...formData,
        created_by: 1 // Get from auth context
      });
      
      if (result.status === 'success') {
        alert('Cylinder created successfully!');
        onSuccess();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Error creating cylinder: ' + error.message);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <form onSubmit={handleSubmit} className="create-cylinder-form">
      <h2>Create New Cylinder</h2>
      
      <input
        type="text"
        name="cylinder_code"
        placeholder="Cylinder Code"
        value={formData.cylinder_code}
        onChange={handleChange}
        required
      />
      
      <input
        type="text"
        name="serial_number"
        placeholder="Serial Number"
        value={formData.serial_number}
        onChange={handleChange}
        required
      />
      
      <input
        type="text"
        name="cylinder_type"
        placeholder="Cylinder Type"
        value={formData.cylinder_type}
        onChange={handleChange}
      />
      
      <input
        type="number"
        name="capacity"
        placeholder="Capacity"
        value={formData.capacity}
        onChange={handleChange}
      />
      
      <select name="capacity_unit" value={formData.capacity_unit} onChange={handleChange}>
        <option value="Liters">Liters</option>
        <option value="Cubic Feet">Cubic Feet</option>
        <option value="Gallons">Gallons</option>
      </select>
      
      <input
        type="text"
        name="manufacturer"
        placeholder="Manufacturer"
        value={formData.manufacturer}
        onChange={handleChange}
      />
      
      <input
        type="date"
        name="manufacture_date"
        value={formData.manufacture_date}
        onChange={handleChange}
      />
      
      <select name="status" value={formData.status} onChange={handleChange}>
        <option value="available">Available</option>
        <option value="in_use">In Use</option>
        <option value="testing">Testing</option>
        <option value="maintenance">Maintenance</option>
      </select>
      
      <button type="submit">Create Cylinder</button>
    </form>
  );
}

export default CreateCylinder;
```

---

## 🧪 Testing in Swagger

Open Swagger UI: **http://localhost:8081/api-docs**

Navigate to the **Cylinders** section to test all endpoints interactively!

---

## 📊 Status Values

- `available` - Cylinder is available for use
- `in_use` - Currently being used
- `testing` - Undergoing testing
- `maintenance` - Under maintenance
- `retired` - No longer in service

---

## ✅ Your Cylinder API is Ready!

All endpoints are live and tested. Use the React examples above to integrate with your UI! 🚀

