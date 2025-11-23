# 🎉 Cystra API - SQL Server Configuration Complete!

## ✅ What Was Done

Your Cystra API has been successfully configured to use **SQL Server** (instead of MySQL) and is now running on the same server as your PayBill API!

---

## 📊 Both APIs Running

### PayBill API (Existing)
- **Port:** 8080
- **Database:** PayBill (SQL Server)
- **Status:** ✅ Running

### Cystra API (New)
- **Port:** 8081  
- **Database:** cystra_db (SQL Server)
- **Status:** ✅ Running

---

## 🔧 Configuration Details

### Database Connection
```env
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=Vaishnoma@2
DB_NAME=cystra_db
```

### JWT Configuration
```env
JWT_SECRET=supersecretkeyforjwt
JWT_EXPIRE=24h
```

---

## 📁 Tables Created

The following tables were created in `cystra_db`:

### 1. users
```sql
- id (INT IDENTITY PRIMARY KEY)
- name (NVARCHAR(100))
- email (NVARCHAR(100) UNIQUE)
- password (NVARCHAR(255))
- created_at (DATETIME)
- updated_at (DATETIME)
```

### 2. products
```sql
- id (INT IDENTITY PRIMARY KEY)
- name (NVARCHAR(255))
- description (NVARCHAR(MAX))
- price (DECIMAL(10,2))
- stock (INT)
- created_by (INT FOREIGN KEY → users.id)
- created_at (DATETIME)
- updated_at (DATETIME)
```

### 3. orders
```sql
- id (INT IDENTITY PRIMARY KEY)
- user_id (INT FOREIGN KEY → users.id)
- total_amount (DECIMAL(10,2))
- status (NVARCHAR(20)) ['pending', 'processing', 'completed', 'cancelled']
- created_at (DATETIME)
- updated_at (DATETIME)
```

---

## 🔄 Key Changes Made

### 1. **Package Changes**
- ❌ Removed: `mysql2`
- ✅ Added: `mssql` (Microsoft SQL Server driver)

### 2. **Database Connection (`db.js`)**
- Changed from MySQL connection pool to SQL Server connection
- Updated query methods to use SQL Server syntax
- Changed from `?` placeholders to `@param` named parameters

### 3. **SQL Schema (`db/schema.sql`)**
- Changed `AUTO_INCREMENT` → `IDENTITY(1,1)`
- Changed `TIMESTAMP` → `DATETIME`
- Changed `VARCHAR` → `NVARCHAR`
- Changed `ENUM` → `NVARCHAR` with CHECK constraint
- Changed `CURRENT_TIMESTAMP` → `GETDATE()`
- Added `GO` statements for batch execution

### 4. **User Repository**
- Updated queries to use `@param` syntax instead of `?`
- Changed `INSERT ... RETURNING` → `INSERT ... OUTPUT INSERTED.id`
- Updated all CRUD operations for SQL Server compatibility

### 5. **Database Init Script (`dbInit.js`)**
- Complete rewrite for SQL Server
- Handles `GO` statement splitting
- Uses `sys.databases` for database checks
- Uses `INFORMATION_SCHEMA.TABLES` for table verification

---

## 🌐 Access URLs

| Resource | URL |
|----------|-----|
| **Swagger UI** | http://localhost:8081/api-docs |
| **API Root** | http://localhost:8081/api |
| **Health Check** | http://localhost:8081/health |
| **Auth Register** | POST http://localhost:8081/api/v1/auth/register |
| **Auth Login** | POST http://localhost:8081/api/v1/auth/login |

---

## 🧪 Testing with Swagger

### Step 1: Open Swagger
Navigate to: **http://localhost:8081/api-docs**

### Step 2: Register a User
1. Expand **POST /api/v1/auth/register**
2. Click **"Try it out"**
3. Enter test data:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
4. Click **"Execute"**
5. Copy the `token` from the response

### Step 3: Authorize
1. Click the **"Authorize" 🔒** button at the top
2. Enter: `Bearer <your_token_here>`
3. Click **"Authorize"** then **"Close"**

### Step 4: Test Protected Endpoints
Now you can test:
- GET /api/v1/users
- GET /api/v1/users/{id}
- PUT /api/v1/users/{id}
- DELETE /api/v1/users/{id}

---

## 📝 Available NPM Commands

```bash
# Start server (production)
npm start

# Start server (development with nodemon)
npm run dev

# Initialize/recreate database
npm run db:init
```

---

## 🔐 SQL Server vs MySQL Differences

### Query Syntax
**MySQL:**
```sql
SELECT * FROM users WHERE id = ?
```

**SQL Server:**
```sql
SELECT * FROM users WHERE id = @id
```

### Auto-increment
**MySQL:**
```sql
id INT AUTO_INCREMENT PRIMARY KEY
```

**SQL Server:**
```sql
id INT IDENTITY(1,1) PRIMARY KEY
```

### Getting Inserted ID
**MySQL:**
```javascript
result.insertId
```

**SQL Server:**
```sql
INSERT INTO users (...) OUTPUT INSERTED.id VALUES (...)
```

### Date Functions
**MySQL:**
```sql
CURRENT_TIMESTAMP
```

**SQL Server:**
```sql
GETDATE()
```

---

## 🎯 Architecture Benefits

### Same Database Server
- ✅ Both APIs use the same SQL Server instance
- ✅ Shared authentication credentials (sa user)
- ✅ Easy to manage both databases
- ✅ Consistent backup strategy

### Different Databases
- ✅ PayBill API → `PayBill` database
- ✅ Cystra API → `cystra_db` database
- ✅ Complete data isolation
- ✅ Independent scaling

### Different Ports
- ✅ No port conflicts
- ✅ Can run both simultaneously
- ✅ Easy to identify which API is which

---

## 🚀 Production Deployment Tips

1. **Change JWT Secret:**
   ```env
   JWT_SECRET=<use_a_strong_random_secret>
   ```

2. **Use Strong Passwords:**
   - Don't use default passwords in production
   - Create separate SQL Server users for each API

3. **Enable SSL/TLS:**
   ```javascript
   options: {
     encrypt: true,
     trustServerCertificate: false
   }
   ```

4. **Set Environment:**
   ```env
   NODE_ENV=production
   ```

5. **Use Connection Pooling:**
   Already configured in `db.js`!

---

## ✅ Summary

Your Cystra API is now:
- ✅ **Running** on port 8081
- ✅ **Connected** to SQL Server (cystra_db database)
- ✅ **Tables created** (users, products, orders)
- ✅ **Swagger enabled** for testing
- ✅ **JWT authentication** configured
- ✅ **Clean architecture** with repositories and services
- ✅ **Compatible** with your existing PayBill API setup

---

## 🎉 You're Ready!

Open **http://localhost:8081/api-docs** and start testing your API!

Both APIs running on the same server with separate databases - perfect setup! 🚀

