# 🗄️ Cystra API - Database Setup Guide

## Prerequisites

- MySQL Server installed and running
- Azure Data Studio or MySQL Workbench (or command line)
- Database credentials (username/password)

---

## 📌 Option 1: Manual Setup Using Azure Data Studio

### Step 1: Connect to MySQL Server

1. Open **Azure Data Studio**
2. Click **"New Connection"**
3. Select **MySQL** as the connection type
4. Enter your credentials:
   ```
   Server: localhost
   Port: 3306
   User: root
   Password: [your password]
   ```
5. Click **Connect**

### Step 2: Run the Schema Script

1. In Azure Data Studio:
   - Go to **File → Open File**
   - Navigate to: `/Users/shailendra/Desktop/Vaishnvi Technologies/CystraCode/Cystra API Code/db/schema.sql`
   
2. **Review the script** - It will:
   - Create `cystra_db` database
   - Create `users` table
   - Create `products` table
   - Create `orders` table
   - Add necessary indexes

3. **Execute the script**:
   - Press **F5** or click the **"Run"** button
   - Wait for completion message

4. **Verify creation**:
   ```sql
   SHOW DATABASES;
   USE cystra_db;
   SHOW TABLES;
   ```

### Step 3: Update .env File

Create/update the `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=cystra_db
```

### Step 4: Restart Your API Server

```bash
cd "Cystra API Code"
npm start
```

---

## 📌 Option 2: Manual Setup Using Command Line

### For MySQL (Recommended):

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE cystra_db;

# Run the schema file
mysql -u root -p cystra_db < "db/schema.sql"
```

### Or run the entire file directly:

```bash
mysql -u root -p < "/Users/shailendra/Desktop/Vaishnvi Technologies/CystraCode/Cystra API Code/db/schema.sql"
```

Enter your password when prompted.

---

## 📌 Option 3: Automatic Setup (Using Init Script)

If you want the database to be created automatically, use the `dbInit.js` script:

```bash
cd "Cystra API Code"
node dbInit.js
```

This will:
- ✅ Check if database exists
- ✅ Create database if needed
- ✅ Create all tables
- ✅ Add indexes
- ✅ Show status messages

---

## ✅ Verification Steps

After setup, verify everything is working:

### 1. Check Database Creation

```sql
SHOW DATABASES LIKE 'cystra_db';
```

### 2. Check Tables

```sql
USE cystra_db;
SHOW TABLES;
```

Expected output:
```
+---------------------+
| Tables_in_cystra_db |
+---------------------+
| orders              |
| products            |
| users               |
+---------------------+
```

### 3. Check Table Structure

```sql
DESCRIBE users;
```

### 4. Test API Connection

Start your server and check:
```bash
curl http://localhost:8081/health
```

If the database is connected, you should see:
```
✅ Database connected successfully
```

---

## 🔧 Troubleshooting

### Error: "Access denied for user"
- Check your MySQL username and password in `.env`
- Make sure MySQL server is running
- Verify user has CREATE DATABASE privileges

### Error: "Unknown database 'cystra_db'"
- The database hasn't been created yet
- Run the schema.sql file manually
- Or use the automatic init script

### Error: "Can't connect to MySQL server"
- Make sure MySQL is running
- Check if port 3306 is correct
- Verify DB_HOST in .env (usually 'localhost' or '127.0.0.1')

### Error: "ER_NOT_SUPPORTED_AUTH_MODE"
- Your MySQL is using newer authentication
- Run this in MySQL:
  ```sql
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
  FLUSH PRIVILEGES;
  ```

---

## 📊 Database Schema Overview

### Users Table
- `id` - Auto-increment primary key
- `name` - User's full name
- `email` - Unique email address
- `password` - Hashed password
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Products Table
- `id` - Auto-increment primary key
- `name` - Product name
- `description` - Product details
- `price` - Decimal (10,2)
- `stock` - Integer
- `created_by` - Foreign key to users
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Orders Table
- `id` - Auto-increment primary key
- `user_id` - Foreign key to users
- `total_amount` - Decimal (10,2)
- `status` - Enum (pending, processing, completed, cancelled)
- `created_at` - Timestamp
- `updated_at` - Timestamp

---

## 🎯 Recommended Approach

**For Development:**
Use **Azure Data Studio** (Option 1) - Visual and easy to debug

**For Production:**
Use **Automatic Setup Script** (Option 3) - Faster and error-proof

**For Quick Testing:**
Use **Command Line** (Option 2) - Fastest

---

## 📝 Next Steps After Database Setup

1. ✅ Database created
2. ✅ Tables created
3. ✅ Update `.env` file
4. ✅ Restart API server
5. ✅ Test registration: `POST /api/v1/auth/register`
6. ✅ Verify in Swagger: `http://localhost:8081/api-docs`

---

## 💡 Pro Tip

Keep a backup of your schema file! You can always regenerate the database:

```bash
# Drop and recreate
mysql -u root -p -e "DROP DATABASE IF EXISTS cystra_db;"
mysql -u root -p < db/schema.sql
```

---

Need help? Check the server logs or contact support!

