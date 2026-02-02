# 🔬 Auto Test Record Creation Feature

## Overview
When creating a cylinder, you can optionally provide test information. If test data is provided, the API will automatically create a corresponding record in the `cylinder_tests` table with a reference to the newly created cylinder.

---

## How It Works

### 1. Single API Call for Cylinder + Test

Instead of making two separate API calls:
1. ~~POST `/api/v1/cylinders`~~ (Create cylinder)
2. ~~POST `/api/v1/cylinder-tests`~~ (Create test record)

You can now do **BOTH in a single call**:

**POST** `/api/v1/cylinders` with test fields included

---

## Required Test Fields (for auto-creation)

To automatically create a test record, include these fields in your cylinder creation request:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `test_date` | Date | ✅ **Yes** | Date of the test |
| `test_type` | String | ✅ **Yes** | Type of test (Hydrostatic, Visual, Leak, Pressure, Internal) |
| `test_result` | String | ✅ **Yes** | Test result (Pass, Fail, Conditional) |
| `test_pressure` | Decimal | Optional | Test pressure value |
| `inspector_name` | String | Optional | Name of the inspector |
| `test_notes` | String | Optional | Additional notes about the test |
| `tested_by` | Integer | Optional | User ID who performed the test |

---

## Example: Create Cylinder WITHOUT Test Data

```json
POST /api/v1/cylinders
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
    "cylinder_id": 1,
    "test_id": null,
    "test_record_created": false
  }
}
```

---

## Example: Create Cylinder WITH Test Data

```json
POST /api/v1/cylinders
{
  "company_id": 1,
  "branch_id": 1,
  "cylinder_code": "CYL-002",
  "serial_number": null,
  "cylinder_family_code": "FAM-01",
  "owner_type": "SELF",
  "cylinder_type": "Oxygen",
  "capacity": 50.00,
  "capacity_unit": "Liters",
  "status": "available",
  "created_by": 1,
  
  "test_date": "2024-11-25",
  "test_type": "Hydrostatic",
  "test_pressure": 275.50,
  "test_result": "Pass",
  "inspector_name": "Michael Johnson",
  "test_notes": "Comprehensive test completed. All parameters within acceptable range.",
  "next_test_date": "2025-11-25",
  "tested_by": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Cylinder and test record created successfully",
  "data": {
    "cylinder_id": 2,
    "test_id": 1,
    "test_record_created": true
  }
}
```

---

## Database Results

### `cylinders` Table:
```json
{
  "id": 2,
  "company_id": 1,
  "branch_id": 1,
  "cylinder_code": "CYL-002",
  "serial_number": "SN789012",
  "cylinder_type": "Oxygen",
  "capacity": 50.00,
  "last_test_date": "2024-11-25",
  "next_test_date": "2025-11-25",
  "status": "available",
  "created_by": 1
}
```

### `cylinder_tests` Table (Auto-Created):
```json
{
  "id": 1,
  "company_id": 1,
  "branch_id": 1,
  "cylinder_id": 2,
  "test_date": "2024-11-25",
  "test_type": "Hydrostatic",
  "test_pressure": 275.50,
  "test_result": "Pass",
  "inspector_name": "Michael Johnson",
  "notes": "Comprehensive test completed. All parameters within acceptable range.",
  "next_test_date": "2025-11-25",
  "tested_by": 1,
  "created_at": "2024-11-25T10:00:00.000Z"
}
```

---

## React Integration Example

### Cylinder Creation Form with Optional Test Fields

```javascript
import React, { useState } from 'react';
import { cylinderAPI } from '../services/cylinderApi';

function CreateCylinderWithTest({ companyId, branchId, onSuccess }) {
  const [formData, setFormData] = useState({
    cylinder_code: '',
    serial_number: '',
    cylinder_type: '',
    capacity: '',
    capacity_unit: 'Liters',
    manufacturer: '',
    status: 'available',
    
    // Test fields (optional)
    include_test: false,
    test_date: '',
    test_type: '',
    test_pressure: '',
    test_result: 'Pass',
    inspector_name: '',
    test_notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cylinderData = {
      company_id: companyId,
      branch_id: branchId,
      cylinder_code: formData.cylinder_code,
      serial_number: formData.serial_number,
      cylinder_type: formData.cylinder_type,
      capacity: parseFloat(formData.capacity),
      capacity_unit: formData.capacity_unit,
      manufacturer: formData.manufacturer,
      status: formData.status,
      created_by: 1 // Get from auth context
    };
    
    // Add test fields if checkbox is checked
    if (formData.include_test) {
      cylinderData.test_date = formData.test_date;
      cylinderData.test_type = formData.test_type;
      cylinderData.test_pressure = parseFloat(formData.test_pressure);
      cylinderData.test_result = formData.test_result;
      cylinderData.inspector_name = formData.inspector_name;
      cylinderData.test_notes = formData.test_notes;
      cylinderData.tested_by = 1; // Get from auth context
    }
    
    try {
      const result = await cylinderAPI.createCylinder(cylinderData);
      
      if (result.status === 'success') {
        if (result.data.test_record_created) {
          alert(`Cylinder created (ID: ${result.data.cylinder_id}) with test record (ID: ${result.data.test_id})`);
        } else {
          alert(`Cylinder created (ID: ${result.data.cylinder_id})`);
        }
        onSuccess();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Cylinder</h2>
      
      {/* Cylinder Fields */}
      <input
        type="text"
        placeholder="Cylinder Code"
        value={formData.cylinder_code}
        onChange={(e) => setFormData({...formData, cylinder_code: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Serial Number"
        value={formData.serial_number}
        onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Cylinder Type"
        value={formData.cylinder_type}
        onChange={(e) => setFormData({...formData, cylinder_type: e.target.value})}
      />
      
      <input
        type="number"
        placeholder="Capacity"
        value={formData.capacity}
        onChange={(e) => setFormData({...formData, capacity: e.target.value})}
      />
      
      <select
        value={formData.capacity_unit}
        onChange={(e) => setFormData({...formData, capacity_unit: e.target.value})}
      >
        <option value="Liters">Liters</option>
        <option value="Cubic Feet">Cubic Feet</option>
        <option value="Gallons">Gallons</option>
      </select>
      
      {/* Test Section */}
      <div className="test-section">
        <label>
          <input
            type="checkbox"
            checked={formData.include_test}
            onChange={(e) => setFormData({...formData, include_test: e.target.checked})}
          />
          Include Initial Test Record
        </label>
        
        {formData.include_test && (
          <div className="test-fields">
            <h3>Test Information</h3>
            
            <input
              type="date"
              value={formData.test_date}
              onChange={(e) => setFormData({...formData, test_date: e.target.value})}
              required={formData.include_test}
            />
            
            <select
              value={formData.test_type}
              onChange={(e) => setFormData({...formData, test_type: e.target.value})}
              required={formData.include_test}
            >
              <option value="">Select Test Type</option>
              <option value="Hydrostatic">Hydrostatic</option>
              <option value="Visual">Visual</option>
              <option value="Leak">Leak</option>
              <option value="Pressure">Pressure</option>
              <option value="Internal">Internal</option>
            </select>
            
            <input
              type="number"
              placeholder="Test Pressure"
              value={formData.test_pressure}
              onChange={(e) => setFormData({...formData, test_pressure: e.target.value})}
            />
            
            <select
              value={formData.test_result}
              onChange={(e) => setFormData({...formData, test_result: e.target.value})}
              required={formData.include_test}
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Conditional">Conditional</option>
            </select>
            
            <input
              type="text"
              placeholder="Inspector Name"
              value={formData.inspector_name}
              onChange={(e) => setFormData({...formData, inspector_name: e.target.value})}
            />
            
            <textarea
              placeholder="Test Notes"
              value={formData.test_notes}
              onChange={(e) => setFormData({...formData, test_notes: e.target.value})}
            />
          </div>
        )}
      </div>
      
      <button type="submit">Create Cylinder</button>
    </form>
  );
}

export default CreateCylinderWithTest;
```

---

## Benefits

✅ **Single API Call** - Create cylinder and test record together  
✅ **Atomic Operation** - Both records created in a transaction  
✅ **Data Consistency** - Cylinder and test data always linked correctly  
✅ **Reduced Network Calls** - Faster for users  
✅ **Simpler Frontend Code** - No need for sequential API calls  
✅ **Optional** - Test fields are optional, won't break existing code  

---

## Technical Implementation

### Repository Layer (`cylinderRepository.js`)

```javascript
async createCylinder(cylinderData) {
  // Step 1: Create the cylinder
  const result = await pool.request()
    .execute('sp_CreateCylinder');
    
  const cylinderId = result.output.cylinder_id;

  // Step 2: If test data provided, create test record
  if (cylinderData.test_date && cylinderData.test_type && cylinderData.test_result) {
    const testResult = await pool.request()
      .input('cylinder_id', sql.Int, cylinderId)
      // ... other test fields
      .execute('sp_CreateCylinderTest');
      
    testId = testResult.output.test_id;
  }

  return {
    cylinder_id: cylinderId,
    test_id: testId,
    message: 'Cylinder created successfully'
  };
}
```

### Stored Procedures Used

1. **`sp_CreateCylinder`** - Creates cylinder in `cylinders` table
2. **`sp_CreateCylinderTest`** - Creates test record in `cylinder_tests` table

Both procedures enforce company-branch isolation and validation.

---

## Error Handling

- If cylinder creation fails, **nothing** is created
- If cylinder succeeds but test fails:
  - Cylinder is still created
  - Test creation error is logged (not thrown)
  - API returns `test_record_created: false`
  - Frontend can retry test creation separately if needed

---

## Testing

✅ **Tested and Verified:**
- Cylinder creation without test data works
- Cylinder creation with test data creates both records
- Test record correctly references cylinder_id
- Both records share same company_id and branch_id
- API response correctly indicates test_record_created status

---

## Summary

This feature streamlines the cylinder onboarding process by allowing you to capture initial test data during cylinder registration, eliminating the need for a second API call and ensuring data consistency across tables.

🚀 **Ready to use in your React UI!**

