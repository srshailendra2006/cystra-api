# 📚 User Signup System - Stored Procedures Guide

## Overview

This document explains how to use the enhanced user signup system with stored procedures for the Cystra API.

---

## 🗄️ Database Tables

### 1. **users_enhanced**
Main user table with comprehensive fields
- Basic info: username, email, password_hash, first_name, last_name
- Contact: phone, profile_image
- Personal: date_of_birth, gender
- Status: is_active, is_email_verified, is_phone_verified
- Security: failed_login_attempts, account_locked_until
- Audit: created_at, updated_at, created_by, updated_by

### 2. **user_roles**
User role definitions (Admin, User, Moderator, Guest)

### 3. **user_role_mapping**
Maps users to their roles (many-to-many)

### 4. **email_verification_tokens**
Stores email verification tokens with expiration

### 5. **password_reset_tokens**
Stores password reset tokens with expiration

### 6. **user_sessions**
Tracks active user sessions and devices

### 7. **user_activity_log**
Logs all user activities for audit trail

---

## 🔧 Stored Procedures

### 1. **sp_RegisterUser** - User Registration

**Purpose:** Register a new user with automatic role assignment

**Parameters:**
```sql
@username NVARCHAR(50) -- Required
@email NVARCHAR(100) -- Required
@password_hash NVARCHAR(255) -- Required (pre-hashed)
@first_name NVARCHAR(50) -- Optional
@last_name NVARCHAR(50) -- Optional
@phone NVARCHAR(20) -- Optional
@user_id INT OUTPUT -- Returns new user ID
@error_message NVARCHAR(500) OUTPUT -- Returns error/success message
```

**Usage Example:**
```sql
DECLARE @user_id INT;
DECLARE @error_msg NVARCHAR(500);

EXEC sp_RegisterUser 
  @username = 'johndoe',
  @email = 'john@example.com',
  @password_hash = '$2a$10$...',  -- Hashed password
  @first_name = 'John',
  @last_name = 'Doe',
  @phone = '+1234567890',
  @user_id = @user_id OUTPUT,
  @error_message = @error_msg OUTPUT;

SELECT @user_id AS NewUserId, @error_msg AS Message;
```

**Return Codes:**
- `0` - Success
- `-1` - Username already exists
- `-2` - Email already exists
- `-999` - System error

---

### 2. **sp_UserLogin** - User Login

**Purpose:** Validates user credentials and checks account status

**Parameters:**
```sql
@email NVARCHAR(100) -- Required
@ip_address NVARCHAR(50) -- Optional
@user_agent NVARCHAR(500) -- Optional
@user_id INT OUTPUT -- Returns user ID
@password_hash NVARCHAR(255) OUTPUT -- Returns stored password hash
@is_active BIT OUTPUT -- Returns if account is active
@is_locked BIT OUTPUT -- Returns if account is locked
@error_message NVARCHAR(500) OUTPUT -- Returns message
```

**Usage Example:**
```sql
DECLARE @user_id INT;
DECLARE @pwd_hash NVARCHAR(255);
DECLARE @is_active BIT;
DECLARE @is_locked BIT;
DECLARE @error_msg NVARCHAR(500);

EXEC sp_UserLogin 
  @email = 'john@example.com',
  @ip_address = '192.168.1.1',
  @user_agent = 'Mozilla/5.0...',
  @user_id = @user_id OUTPUT,
  @password_hash = @pwd_hash OUTPUT,
  @is_active = @is_active OUTPUT,
  @is_locked = @is_locked OUTPUT,
  @error_message = @error_msg OUTPUT;

-- Now compare @pwd_hash with user's input in your application
```

**Return Codes:**
- `0` - User found, proceed with password verification
- `-1` - Invalid credentials
- `-2` - Account deactivated
- `-3` - Account locked

---

### 3. **sp_UpdateLoginSuccess** - Update Successful Login

**Purpose:** Updates user record after successful login

**Parameters:**
```sql
@user_id INT -- Required
@ip_address NVARCHAR(50) -- Optional
@user_agent NVARCHAR(500) -- Optional
```

**Usage Example:**
```sql
EXEC sp_UpdateLoginSuccess 
  @user_id = 1,
  @ip_address = '192.168.1.1',
  @user_agent = 'Mozilla/5.0...';
```

---

### 4. **sp_UpdateLoginFailure** - Update Failed Login

**Purpose:** Tracks failed login attempts and locks account after 5 failures

**Parameters:**
```sql
@user_id INT -- Required
@ip_address NVARCHAR(50) -- Optional
```

**Usage Example:**
```sql
EXEC sp_UpdateLoginFailure 
  @user_id = 1,
  @ip_address = '192.168.1.1';
```

**Note:** Account is locked for 30 minutes after 5 failed attempts

---

### 5. **sp_GetUserById** - Get User Details

**Purpose:** Retrieves complete user information with roles

**Parameters:**
```sql
@user_id INT -- Required
```

**Usage Example:**
```sql
EXEC sp_GetUserById @user_id = 1;
```

**Returns:** Full user profile with roles as comma-separated string

---

### 6. **sp_GetUserByEmail** - Get User by Email

**Purpose:** Retrieves user information by email

**Parameters:**
```sql
@email NVARCHAR(100) -- Required
```

**Usage Example:**
```sql
EXEC sp_GetUserByEmail @email = 'john@example.com';
```

---

### 7. **sp_UpdateUserProfile** - Update User Profile

**Purpose:** Updates user profile information

**Parameters:**
```sql
@user_id INT -- Required
@first_name NVARCHAR(50) -- Optional
@last_name NVARCHAR(50) -- Optional
@phone NVARCHAR(20) -- Optional
@date_of_birth DATE -- Optional
@gender NVARCHAR(10) -- Optional
@profile_image NVARCHAR(500) -- Optional
@updated_by INT -- Optional
```

**Usage Example:**
```sql
EXEC sp_UpdateUserProfile 
  @user_id = 1,
  @first_name = 'John',
  @last_name = 'Smith',
  @phone = '+1234567890',
  @date_of_birth = '1990-01-01',
  @gender = 'Male';
```

---

### 8. **sp_CreateEmailVerificationToken** - Create Verification Token

**Purpose:** Creates email verification token for user

**Parameters:**
```sql
@user_id INT -- Required
@token NVARCHAR(255) -- Required (generated token)
@expires_in_hours INT -- Optional (default: 24)
```

**Usage Example:**
```sql
EXEC sp_CreateEmailVerificationToken 
  @user_id = 1,
  @token = 'abc123xyz789',
  @expires_in_hours = 24;
```

---

### 9. **sp_VerifyEmailToken** - Verify Email Token

**Purpose:** Verifies email verification token and marks email as verified

**Parameters:**
```sql
@token NVARCHAR(255) -- Required
@user_id INT OUTPUT -- Returns user ID if valid
@is_valid BIT OUTPUT -- Returns if token is valid
```

**Usage Example:**
```sql
DECLARE @user_id INT;
DECLARE @is_valid BIT;

EXEC sp_VerifyEmailToken 
  @token = 'abc123xyz789',
  @user_id = @user_id OUTPUT,
  @is_valid = @is_valid OUTPUT;

IF @is_valid = 1
  PRINT 'Email verified successfully for user ' + CAST(@user_id AS NVARCHAR);
ELSE
  PRINT 'Invalid or expired token';
```

---

### 10. **sp_CreatePasswordResetToken** - Create Reset Token

**Purpose:** Creates password reset token

**Parameters:**
```sql
@email NVARCHAR(100) -- Required
@token NVARCHAR(255) -- Required
@ip_address NVARCHAR(50) -- Optional
@expires_in_hours INT -- Optional (default: 1)
@user_id INT OUTPUT -- Returns user ID
```

**Usage Example:**
```sql
DECLARE @user_id INT;

EXEC sp_CreatePasswordResetToken 
  @email = 'john@example.com',
  @token = 'reset_xyz123',
  @ip_address = '192.168.1.1',
  @expires_in_hours = 1,
  @user_id = @user_id OUTPUT;
```

---

### 11. **sp_ResetPassword** - Reset Password

**Purpose:** Resets user password using valid token

**Parameters:**
```sql
@token NVARCHAR(255) -- Required
@new_password_hash NVARCHAR(255) -- Required (pre-hashed)
@ip_address NVARCHAR(50) -- Optional
```

**Usage Example:**
```sql
EXEC sp_ResetPassword 
  @token = 'reset_xyz123',
  @new_password_hash = '$2a$10$...',
  @ip_address = '192.168.1.1';
```

**Return Codes:**
- `0` - Success
- `-1` - Invalid or expired token

---

### 12. **sp_GetAllUsers** - Get Users with Pagination

**Purpose:** Retrieves paginated list of users with search

**Parameters:**
```sql
@page_number INT -- Optional (default: 1)
@page_size INT -- Optional (default: 10)
@search_term NVARCHAR(100) -- Optional (searches username, email, names)
@is_active BIT -- Optional (filter by active status)
@total_count INT OUTPUT -- Returns total count
```

**Usage Example:**
```sql
DECLARE @total INT;

EXEC sp_GetAllUsers 
  @page_number = 1,
  @page_size = 20,
  @search_term = 'john',
  @is_active = 1,
  @total_count = @total OUTPUT;

SELECT @total AS TotalUsers;
```

---

### 13. **sp_DeactivateUser** - Deactivate User Account

**Purpose:** Deactivates user account and all sessions

**Parameters:**
```sql
@user_id INT -- Required
@deactivated_by INT -- Optional
```

**Usage Example:**
```sql
EXEC sp_DeactivateUser 
  @user_id = 1,
  @deactivated_by = 100; -- Admin user ID
```

---

### 14. **sp_CreateUserSession** - Create Session

**Purpose:** Creates a new user session

**Parameters:**
```sql
@user_id INT -- Required
@session_token NVARCHAR(500) -- Required (JWT or session ID)
@ip_address NVARCHAR(50) -- Optional
@user_agent NVARCHAR(500) -- Optional
@device_type NVARCHAR(50) -- Optional (Web, Mobile, Desktop)
@expires_in_hours INT -- Optional (default: 24)
```

**Usage Example:**
```sql
EXEC sp_CreateUserSession 
  @user_id = 1,
  @session_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  @ip_address = '192.168.1.1',
  @user_agent = 'Mozilla/5.0...',
  @device_type = 'Web',
  @expires_in_hours = 24;
```

---

### 15. **sp_ValidateSession** - Validate Session

**Purpose:** Validates if session is active and not expired

**Parameters:**
```sql
@session_token NVARCHAR(500) -- Required
@user_id INT OUTPUT -- Returns user ID if valid
@is_valid BIT OUTPUT -- Returns if session is valid
```

**Usage Example:**
```sql
DECLARE @user_id INT;
DECLARE @is_valid BIT;

EXEC sp_ValidateSession 
  @session_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  @user_id = @user_id OUTPUT,
  @is_valid = @is_valid OUTPUT;

IF @is_valid = 1
  PRINT 'Session valid for user ' + CAST(@user_id AS NVARCHAR);
ELSE
  PRINT 'Invalid or expired session';
```

---

## 🔄 Complete Registration & Login Flow

### Registration Flow:
```sql
-- 1. Register user
DECLARE @user_id INT, @error_msg NVARCHAR(500);
EXEC sp_RegisterUser 
  @username = 'johndoe',
  @email = 'john@example.com',
  @password_hash = 'hashed_password',
  @first_name = 'John',
  @last_name = 'Doe',
  @user_id = @user_id OUTPUT,
  @error_message = @error_msg OUTPUT;

-- 2. Create email verification token
IF @user_id IS NOT NULL
BEGIN
  EXEC sp_CreateEmailVerificationToken 
    @user_id = @user_id,
    @token = 'verification_token_123';
  -- Send email with token to user
END
```

### Login Flow:
```sql
-- 1. Attempt login
DECLARE @user_id INT, @pwd_hash NVARCHAR(255);
DECLARE @is_active BIT, @is_locked BIT, @error_msg NVARCHAR(500);

EXEC sp_UserLogin 
  @email = 'john@example.com',
  @ip_address = '192.168.1.1',
  @user_id = @user_id OUTPUT,
  @password_hash = @pwd_hash OUTPUT,
  @is_active = @is_active OUTPUT,
  @is_locked = @is_locked OUTPUT,
  @error_message = @error_msg OUTPUT;

-- 2. Verify password in application (bcrypt.compare)
-- If password matches:
EXEC sp_UpdateLoginSuccess 
  @user_id = @user_id,
  @ip_address = '192.168.1.1';

EXEC sp_CreateUserSession 
  @user_id = @user_id,
  @session_token = 'jwt_token_here';

-- If password doesn't match:
EXEC sp_UpdateLoginFailure 
  @user_id = @user_id,
  @ip_address = '192.168.1.1';
```

---

## 📋 Installation

Run the SQL script:
```bash
# Using Azure Data Studio or SQL Server Management Studio
Open: db/user_signup_enhanced.sql
Execute the script

# Or using command line
sqlcmd -S localhost -U sa -P your_password -i db/user_signup_enhanced.sql
```

---

## 🔒 Security Features

1. **Password Hashing** - Passwords are never stored in plain text
2. **Account Locking** - Auto-locks after 5 failed login attempts
3. **Token Expiration** - All tokens have expiration times
4. **Activity Logging** - All user activities are logged
5. **Session Management** - Track and validate active sessions
6. **Email Verification** - Verify user email addresses
7. **Password Reset** - Secure password reset flow

---

## 💡 Best Practices

1. **Always hash passwords** before passing to stored procedures
2. **Use transactions** for critical operations
3. **Validate tokens** before accepting user actions
4. **Monitor activity logs** for suspicious behavior
5. **Clean up expired tokens** regularly
6. **Use prepared statements** in your application
7. **Implement rate limiting** at application level

---

## 🧪 Testing

Test each stored procedure:

```sql
-- Test registration
DECLARE @uid INT, @msg NVARCHAR(500);
EXEC sp_RegisterUser 'testuser', 'test@example.com', 'hash123', 
     'Test', 'User', '+1234567890', @uid OUTPUT, @msg OUTPUT;
SELECT @uid, @msg;

-- Test login
DECLARE @uid2 INT, @pwd NVARCHAR(255), @active BIT, @locked BIT, @msg2 NVARCHAR(500);
EXEC sp_UserLogin 'test@example.com', '127.0.0.1', NULL, 
     @uid2 OUTPUT, @pwd OUTPUT, @active OUTPUT, @locked OUTPUT, @msg2 OUTPUT;
SELECT @uid2, @pwd, @active, @locked, @msg2;

-- Test get user
EXEC sp_GetUserById @uid;
EXEC sp_GetUserByEmail 'test@example.com';

-- Test pagination
DECLARE @total INT;
EXEC sp_GetAllUsers 1, 10, NULL, 1, @total OUTPUT;
SELECT @total AS TotalUsers;
```

---

## 📚 Additional Resources

- SQL Server Documentation: https://docs.microsoft.com/en-us/sql/
- bcrypt for password hashing: https://www.npmjs.com/package/bcryptjs
- JWT for sessions: https://jwt.io/

---

**Need Help?** Check the main README.md or contact support!

