# 📝 User Registration Flow - Company & Branch System

## 🎯 Two Ways to Register

You can register users using **Company/Branch Names** (easier) or **IDs** (faster).

---

## ✅ Option 1: Using Company Name & Branch Name (RECOMMENDED FOR YOUR UI)

### Frontend Flow:
```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER OPENS SIGNUP PAGE                                  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. USER FILLS FORM:                                         │
│    • Company Name: "Cystra Industries"     (text input)     │
│    • Branch Name: "Main Branch - NYC"      (text input)     │
│    • Username: "johndoe"                                    │
│    • Email: "john@example.com"                              │
│    • Password: "password123"                                │
│    • First Name: "John"                     (optional)      │
│    • Last Name: "Doe"                       (optional)      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FRONTEND SENDS TO API:                                   │
│    POST /api/v1/auth/register                               │
│    {                                                         │
│      "company_name": "Cystra Industries",                   │
│      "branch_name": "Main Branch - NYC",                    │
│      "username": "johndoe",                                 │
│      "email": "john@example.com",                           │
│      "password": "password123",                             │
│      "first_name": "John",                                  │
│      "last_name": "Doe"                                     │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. API BACKEND PROCESSING:                                  │
│                                                              │
│    Step 4.1: Lookup Company ID                              │
│    ┌──────────────────────────────────────────────┐        │
│    │ SELECT id FROM companies                     │        │
│    │ WHERE company_name = 'Cystra Industries'     │        │
│    │ AND is_active = 1                            │        │
│    └──────────────────────────────────────────────┘        │
│    Result: company_id = 1                                   │
│                                                              │
│    Step 4.2: Lookup Branch ID                               │
│    ┌──────────────────────────────────────────────┐        │
│    │ SELECT id FROM branches                      │        │
│    │ WHERE branch_name = 'Main Branch - NYC'      │        │
│    │ AND company_id = 1                           │        │
│    │ AND is_active = 1                            │        │
│    └──────────────────────────────────────────────┘        │
│    Result: branch_id = 1                                    │
│                                                              │
│    Step 4.3: Hash Password                                  │
│    password_hash = bcrypt.hash("password123")               │
│                                                              │
│    Step 4.4: Call Stored Procedure                          │
│    ┌──────────────────────────────────────────────┐        │
│    │ EXEC sp_RegisterUser                         │        │
│    │   @company_id = 1,                           │        │
│    │   @branch_id = 1,                            │        │
│    │   @username = 'johndoe',                     │        │
│    │   @email = 'john@example.com',               │        │
│    │   @password_hash = 'hashed...',              │        │
│    │   @first_name = 'John',                      │        │
│    │   @last_name = 'Doe'                         │        │
│    └──────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. STORED PROCEDURE INSERTS INTO USERS TABLE:              │
│                                                              │
│    INSERT INTO users (                                      │
│      company_id,      -- 1                                  │
│      branch_id,       -- 1                                  │
│      username,        -- 'johndoe'                          │
│      email,           -- 'john@example.com'                 │
│      password_hash,   -- 'hashed...'                        │
│      first_name,      -- 'John'                             │
│      last_name        -- 'Doe'                              │
│    )                                                         │
│    VALUES (1, 1, 'johndoe', 'john@example.com', ...)       │
│                                                              │
│    Returns: user_id = 15                                    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. API GENERATES JWT TOKEN:                                │
│    token = jwt.sign({                                       │
│      user_id: 15,                                           │
│      company_id: 1,                                         │
│      branch_id: 1,                                          │
│      email: "john@example.com"                              │
│    })                                                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. API RETURNS SUCCESS:                                     │
│    {                                                         │
│      "status": "success",                                   │
│      "message": "User registered successfully",             │
│      "data": {                                              │
│        "user": {                                            │
│          "user_id": 15,                                     │
│          "company_id": 1,                                   │
│          "branch_id": 1,                                    │
│          "username": "johndoe",                             │
│          "email": "john@example.com"                        │
│        },                                                    │
│        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..."          │
│      }                                                       │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. FRONTEND STORES TOKEN & REDIRECTS:                      │
│    • Store JWT token in localStorage/cookie                │
│    • Redirect to dashboard                                 │
│    • User can now make authenticated requests!             │
└─────────────────────────────────────────────────────────────┘
```

### Example Code (Frontend):
```javascript
// Your signup form submits:
const signupData = {
  company_name: document.getElementById('companyName').value, // "Cystra Industries"
  branch_name: document.getElementById('branchName').value,   // "Main Branch - NYC"
  username: document.getElementById('username').value,
  email: document.getElementById('email').value,
  password: document.getElementById('password').value,
  first_name: document.getElementById('firstName').value,
  last_name: document.getElementById('lastName').value
};

// Send to API
const response = await fetch('http://localhost:8081/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(signupData)
});

const result = await response.json();
if (result.status === 'success') {
  // Store token
  localStorage.setItem('token', result.data.token);
  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

---

## 🚀 Option 2: Using Company ID & Branch ID (Alternative)

### Frontend Flow:
```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER OPENS SIGNUP PAGE                                  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND LOADS COMPANIES:                                │
│    GET /api/v1/companies                                    │
│    Response: [                                              │
│      {id: 1, name: "Cystra Industries"},                    │
│      {id: 2, name: "Global Gas Solutions"}                  │
│    ]                                                         │
│    → Populate dropdown                                      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. USER SELECTS COMPANY:                                    │
│    Selected: "Cystra Industries" (id: 1)                    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. FRONTEND LOADS BRANCHES FOR COMPANY:                    │
│    GET /api/v1/companies/1/branches                         │
│    Response: [                                              │
│      {id: 1, name: "Main Branch - NYC"},                    │
│      {id: 2, name: "West Branch - LA"}                      │
│    ]                                                         │
│    → Populate branch dropdown                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. USER SELECTS BRANCH & FILLS FORM:                       │
│    • Branch: "Main Branch - NYC" (id: 1)                    │
│    • Username: "johndoe"                                    │
│    • Email: "john@example.com"                              │
│    • Password: "password123"                                │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. FRONTEND SENDS TO API:                                   │
│    POST /api/v1/auth/register                               │
│    {                                                         │
│      "company_id": 1,          ← ID from step 3             │
│      "branch_id": 1,           ← ID from step 5             │
│      "username": "johndoe",                                 │
│      "email": "john@example.com",                           │
│      "password": "password123"                              │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. API BACKEND PROCESSING:                                  │
│    (Simpler - no lookup needed!)                            │
│    • Hash password                                          │
│    • Call sp_RegisterUser with IDs                          │
│    • Insert into users table                                │
│    • Generate JWT token                                     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. SUCCESS - Same as Option 1                              │
└─────────────────────────────────────────────────────────────┘
```

### Example Code (Frontend):
```javascript
// Load companies on page load
async function loadCompanies() {
  const response = await fetch('http://localhost:8081/api/v1/companies');
  const result = await response.json();
  
  const companySelect = document.getElementById('companyId');
  result.data.forEach(company => {
    const option = new Option(company.company_name, company.company_id);
    companySelect.add(option);
  });
}

// Load branches when company changes
async function loadBranches(companyId) {
  const response = await fetch(`http://localhost:8081/api/v1/companies/${companyId}/branches`);
  const result = await response.json();
  
  const branchSelect = document.getElementById('branchId');
  branchSelect.innerHTML = '<option value="">Select Branch</option>';
  result.data.forEach(branch => {
    const option = new Option(branch.branch_name, branch.id);
    branchSelect.add(option);
  });
}

// Submit registration
const signupData = {
  company_id: parseInt(document.getElementById('companyId').value),
  branch_id: parseInt(document.getElementById('branchId').value),
  username: document.getElementById('username').value,
  email: document.getElementById('email').value,
  password: document.getElementById('password').value
};
```

---

## 📊 Database Tables After Registration

### users Table:
```sql
user_id | company_id | branch_id | username | email              | password_hash | first_name | last_name
--------|------------|-----------|----------|--------------------|--------------|-----------|-----------
   15   |     1      |     1     | johndoe  | john@example.com   | $2b$10...    | John      | Doe
```

### How IDs Got There:
- **company_id** = 1 → Either provided by frontend OR looked up from company_name
- **branch_id** = 1 → Either provided by frontend OR looked up from branch_name

---

## ✅ Comparison: Which Approach to Use?

| Feature | Option 1: Names | Option 2: IDs |
|---------|-----------------|---------------|
| **Frontend Complexity** | ✅ Simple (just text inputs) | ❌ More complex (dropdowns + API calls) |
| **API Calls** | 1 call (register) | 3 calls (companies, branches, register) |
| **User Experience** | ✅ Fast (type and go) | ⚠️ Slower (select from dropdowns) |
| **Error Handling** | Must handle "company not found" | Pre-validated (can only select existing) |
| **Typos** | ⚠️ User might type wrong name | ✅ No typos possible |
| **Backend Work** | More (lookup IDs) | Less (IDs already provided) |
| **Recommended For** | ✅ Your case (text inputs) | Dropdown-based UIs |

---

## 🎯 Your Current Implementation

Based on your question, you're using **Option 1** (Company Name + Branch Name):

### Your Frontend Form:
```html
<input type="text" name="companyName" placeholder="Company Name" />
<input type="text" name="branchName" placeholder="Branch Name" />
<input type="text" name="username" placeholder="Username" />
<input type="email" name="email" placeholder="Email" />
<input type="password" name="password" placeholder="Password" />
```

### Your API Request:
```javascript
{
  "company_name": "Cystra Industries",     ← User typed this
  "branch_name": "Main Branch - NYC",      ← User typed this
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

### What Happens:
1. API receives company_name and branch_name
2. API queries database to find matching company_id
3. API queries database to find matching branch_id
4. API calls sp_RegisterUser with the IDs
5. Stored procedure inserts row into users table with company_id and branch_id
6. ✅ User created!

---

## 🧪 Test Both Approaches

### Test Option 1 (Names):
```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Cystra Industries",
    "branch_name": "Main Branch - NYC",
    "username": "testuser1",
    "email": "test1@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### Test Option 2 (IDs):
```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 1,
    "branch_id": 1,
    "username": "testuser2",
    "email": "test2@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

---

## 🔍 Verify User Was Created

```sql
SELECT 
  user_id,
  company_id,
  branch_id,
  username,
  email,
  first_name,
  last_name,
  created_at
FROM users
WHERE username = 'testuser1';
```

Result:
```
user_id | company_id | branch_id | username  | email             | first_name | last_name
--------|------------|-----------|-----------|-------------------|------------|----------
   15   |     1      |     1     | testuser1 | test1@example.com | Test       | User
```

✅ **company_id and branch_id are now in the users table!**

---

## 📝 Summary

**Your Question:** How do company_id and branch_id get into the users table?

**Answer:** 
1. User provides company_name and branch_name in signup form
2. API looks up company_id from companies table
3. API looks up branch_id from branches table  
4. API calls sp_RegisterUser stored procedure with the IDs
5. Stored procedure inserts a new row in users table with those IDs
6. ✅ Done! User is now linked to their company and branch!

**The Flow:**
```
User Input (Names) → API Lookup (IDs) → Stored Procedure → users Table
```

