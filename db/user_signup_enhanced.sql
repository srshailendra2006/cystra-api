-- ============================================================
-- Enhanced User Signup System with Stored Procedures
-- Database: cystra_db (SQL Server)
-- ============================================================

USE cystra_db;
GO

-- ============================================================
-- TABLE 1: Enhanced Users Table
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users_enhanced')
BEGIN
  CREATE TABLE users_enhanced (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(50),
    last_name NVARCHAR(50),
    phone NVARCHAR(20),
    profile_image NVARCHAR(500),
    date_of_birth DATE,
    gender NVARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    is_active BIT DEFAULT 1,
    is_email_verified BIT DEFAULT 0,
    is_phone_verified BIT DEFAULT 0,
    email_verified_at DATETIME,
    last_login_at DATETIME,
    failed_login_attempts INT DEFAULT 0,
    account_locked_until DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by INT,
    updated_by INT
  );
  
  CREATE INDEX idx_username ON users_enhanced(username);
  CREATE INDEX idx_email ON users_enhanced(email);
  CREATE INDEX idx_is_active ON users_enhanced(is_active);
  CREATE INDEX idx_email_verified ON users_enhanced(is_email_verified);
  
  PRINT 'Table users_enhanced created successfully';
END
GO

-- ============================================================
-- TABLE 2: User Roles
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_roles')
BEGIN
  CREATE TABLE user_roles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50) NOT NULL UNIQUE,
    description NVARCHAR(255),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
  );
  
  -- Insert default roles
  INSERT INTO user_roles (role_name, description) VALUES
  ('Admin', 'System Administrator with full access'),
  ('User', 'Regular user with standard access'),
  ('Moderator', 'Can moderate content and users'),
  ('Guest', 'Limited access guest user');
  
  PRINT 'Table user_roles created with default roles';
END
GO

-- ============================================================
-- TABLE 3: User Role Mapping
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_role_mapping')
BEGIN
  CREATE TABLE user_role_mapping (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at DATETIME DEFAULT GETDATE(),
    assigned_by INT,
    FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    UNIQUE (user_id, role_id)
  );
  
  CREATE INDEX idx_user_id ON user_role_mapping(user_id);
  CREATE INDEX idx_role_id ON user_role_mapping(role_id);
  
  PRINT 'Table user_role_mapping created successfully';
END
GO

-- ============================================================
-- TABLE 4: Email Verification Tokens
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'email_verification_tokens')
BEGIN
  CREATE TABLE email_verification_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token NVARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    is_used BIT DEFAULT 0,
    used_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE CASCADE
  );
  
  CREATE INDEX idx_token ON email_verification_tokens(token);
  CREATE INDEX idx_user_id ON email_verification_tokens(user_id);
  
  PRINT 'Table email_verification_tokens created successfully';
END
GO

-- ============================================================
-- TABLE 5: Password Reset Tokens
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'password_reset_tokens')
BEGIN
  CREATE TABLE password_reset_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token NVARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    is_used BIT DEFAULT 0,
    used_at DATETIME,
    ip_address NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE CASCADE
  );
  
  CREATE INDEX idx_token ON password_reset_tokens(token);
  CREATE INDEX idx_user_id ON password_reset_tokens(user_id);
  
  PRINT 'Table password_reset_tokens created successfully';
END
GO

-- ============================================================
-- TABLE 6: User Sessions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_sessions')
BEGIN
  CREATE TABLE user_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    session_token NVARCHAR(500) NOT NULL UNIQUE,
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(500),
    device_type NVARCHAR(50),
    is_active BIT DEFAULT 1,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    last_activity_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE CASCADE
  );
  
  CREATE INDEX idx_session_token ON user_sessions(session_token);
  CREATE INDEX idx_user_id ON user_sessions(user_id);
  CREATE INDEX idx_is_active ON user_sessions(is_active);
  
  PRINT 'Table user_sessions created successfully';
END
GO

-- ============================================================
-- TABLE 7: User Activity Log
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_activity_log')
BEGIN
  CREATE TABLE user_activity_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type NVARCHAR(50) NOT NULL,
    description NVARCHAR(500),
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE CASCADE
  );
  
  CREATE INDEX idx_user_id ON user_activity_log(user_id);
  CREATE INDEX idx_activity_type ON user_activity_log(activity_type);
  CREATE INDEX idx_created_at ON user_activity_log(created_at);
  
  PRINT 'Table user_activity_log created successfully';
END
GO

-- ============================================================
-- STORED PROCEDURE 1: User Registration
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_RegisterUser')
  DROP PROCEDURE sp_RegisterUser;
GO

CREATE PROCEDURE sp_RegisterUser
  @username NVARCHAR(50),
  @email NVARCHAR(100),
  @password_hash NVARCHAR(255),
  @first_name NVARCHAR(50) = NULL,
  @last_name NVARCHAR(50) = NULL,
  @phone NVARCHAR(20) = NULL,
  @user_id INT OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;
    
    -- Check if username already exists
    IF EXISTS (SELECT 1 FROM users_enhanced WHERE username = @username)
    BEGIN
      SET @error_message = 'Username already exists';
      ROLLBACK TRANSACTION;
      RETURN -1;
    END
    
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users_enhanced WHERE email = @email)
    BEGIN
      SET @error_message = 'Email already exists';
      ROLLBACK TRANSACTION;
      RETURN -2;
    END
    
    -- Insert new user
    INSERT INTO users_enhanced (username, email, password_hash, first_name, last_name, phone)
    VALUES (@username, @email, @password_hash, @first_name, @last_name, @phone);
    
    SET @user_id = SCOPE_IDENTITY();
    
    -- Assign default 'User' role
    DECLARE @user_role_id INT;
    SELECT @user_role_id = id FROM user_roles WHERE role_name = 'User';
    
    IF @user_role_id IS NOT NULL
    BEGIN
      INSERT INTO user_role_mapping (user_id, role_id)
      VALUES (@user_id, @user_role_id);
    END
    
    -- Log activity
    INSERT INTO user_activity_log (user_id, activity_type, description)
    VALUES (@user_id, 'REGISTRATION', 'User registered successfully');
    
    SET @error_message = 'User registered successfully';
    COMMIT TRANSACTION;
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;
    
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_RegisterUser created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 2: User Login
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UserLogin')
  DROP PROCEDURE sp_UserLogin;
GO

CREATE PROCEDURE sp_UserLogin
  @email NVARCHAR(100),
  @ip_address NVARCHAR(50) = NULL,
  @user_agent NVARCHAR(500) = NULL,
  @user_id INT OUTPUT,
  @password_hash NVARCHAR(255) OUTPUT,
  @is_active BIT OUTPUT,
  @is_locked BIT OUTPUT,
  @error_message NVARCHAR(500) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Get user details
    SELECT 
      @user_id = id,
      @password_hash = password_hash,
      @is_active = is_active,
      @is_locked = CASE WHEN account_locked_until > GETDATE() THEN 1 ELSE 0 END
    FROM users_enhanced
    WHERE email = @email;
    
    -- Check if user exists
    IF @user_id IS NULL
    BEGIN
      SET @error_message = 'Invalid credentials';
      RETURN -1;
    END
    
    -- Check if account is active
    IF @is_active = 0
    BEGIN
      SET @error_message = 'Account is deactivated';
      RETURN -2;
    END
    
    -- Check if account is locked
    IF @is_locked = 1
    BEGIN
      SET @error_message = 'Account is locked. Please try again later.';
      RETURN -3;
    END
    
    -- Log activity
    INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent)
    VALUES (@user_id, 'LOGIN_ATTEMPT', 'User login attempt', @ip_address, @user_agent);
    
    SET @error_message = 'User found';
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    SET @error_message = ERROR_MESSAGE();
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_UserLogin created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 3: Update Login Success
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UpdateLoginSuccess')
  DROP PROCEDURE sp_UpdateLoginSuccess;
GO

CREATE PROCEDURE sp_UpdateLoginSuccess
  @user_id INT,
  @ip_address NVARCHAR(50) = NULL,
  @user_agent NVARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Update last login and reset failed attempts
    UPDATE users_enhanced
    SET last_login_at = GETDATE(),
        failed_login_attempts = 0,
        account_locked_until = NULL
    WHERE id = @user_id;
    
    -- Log successful login
    INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent)
    VALUES (@user_id, 'LOGIN_SUCCESS', 'User logged in successfully', @ip_address, @user_agent);
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_UpdateLoginSuccess created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 4: Update Login Failure
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UpdateLoginFailure')
  DROP PROCEDURE sp_UpdateLoginFailure;
GO

CREATE PROCEDURE sp_UpdateLoginFailure
  @user_id INT,
  @ip_address NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    DECLARE @failed_attempts INT;
    
    -- Increment failed login attempts
    UPDATE users_enhanced
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = @user_id;
    
    -- Get current failed attempts
    SELECT @failed_attempts = failed_login_attempts
    FROM users_enhanced
    WHERE id = @user_id;
    
    -- Lock account after 5 failed attempts for 30 minutes
    IF @failed_attempts >= 5
    BEGIN
      UPDATE users_enhanced
      SET account_locked_until = DATEADD(MINUTE, 30, GETDATE())
      WHERE id = @user_id;
      
      -- Log account lock
      INSERT INTO user_activity_log (user_id, activity_type, description, ip_address)
      VALUES (@user_id, 'ACCOUNT_LOCKED', 'Account locked due to failed login attempts', @ip_address);
    END
    
    -- Log failed login
    INSERT INTO user_activity_log (user_id, activity_type, description, ip_address)
    VALUES (@user_id, 'LOGIN_FAILED', 'Failed login attempt', @ip_address);
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_UpdateLoginFailure created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 5: Get User By ID
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetUserById')
  DROP PROCEDURE sp_GetUserById;
GO

CREATE PROCEDURE sp_GetUserById
  @user_id INT
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.profile_image,
    u.date_of_birth,
    u.gender,
    u.is_active,
    u.is_email_verified,
    u.is_phone_verified,
    u.email_verified_at,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    STRING_AGG(r.role_name, ',') AS roles
  FROM users_enhanced u
  LEFT JOIN user_role_mapping urm ON u.id = urm.user_id
  LEFT JOIN user_roles r ON urm.role_id = r.id
  WHERE u.id = @user_id
  GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.phone, 
           u.profile_image, u.date_of_birth, u.gender, u.is_active, 
           u.is_email_verified, u.is_phone_verified, u.email_verified_at, 
           u.last_login_at, u.created_at, u.updated_at;
END
GO

PRINT 'Stored Procedure sp_GetUserById created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 6: Get User By Email
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetUserByEmail')
  DROP PROCEDURE sp_GetUserByEmail;
GO

CREATE PROCEDURE sp_GetUserByEmail
  @email NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT 
    u.id,
    u.username,
    u.email,
    u.password_hash,
    u.first_name,
    u.last_name,
    u.phone,
    u.is_active,
    u.is_email_verified,
    u.last_login_at,
    u.failed_login_attempts,
    u.account_locked_until,
    STRING_AGG(r.role_name, ',') AS roles
  FROM users_enhanced u
  LEFT JOIN user_role_mapping urm ON u.id = urm.user_id
  LEFT JOIN user_roles r ON urm.role_id = r.id
  WHERE u.email = @email
  GROUP BY u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name, 
           u.phone, u.is_active, u.is_email_verified, u.last_login_at, 
           u.failed_login_attempts, u.account_locked_until;
END
GO

PRINT 'Stored Procedure sp_GetUserByEmail created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 7: Update User Profile
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_UpdateUserProfile')
  DROP PROCEDURE sp_UpdateUserProfile;
GO

CREATE PROCEDURE sp_UpdateUserProfile
  @user_id INT,
  @first_name NVARCHAR(50) = NULL,
  @last_name NVARCHAR(50) = NULL,
  @phone NVARCHAR(20) = NULL,
  @date_of_birth DATE = NULL,
  @gender NVARCHAR(10) = NULL,
  @profile_image NVARCHAR(500) = NULL,
  @updated_by INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    UPDATE users_enhanced
    SET 
      first_name = COALESCE(@first_name, first_name),
      last_name = COALESCE(@last_name, last_name),
      phone = COALESCE(@phone, phone),
      date_of_birth = COALESCE(@date_of_birth, date_of_birth),
      gender = COALESCE(@gender, gender),
      profile_image = COALESCE(@profile_image, profile_image),
      updated_at = GETDATE(),
      updated_by = @updated_by
    WHERE id = @user_id;
    
    -- Log activity
    INSERT INTO user_activity_log (user_id, activity_type, description)
    VALUES (@user_id, 'PROFILE_UPDATE', 'User profile updated');
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_UpdateUserProfile created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 8: Create Email Verification Token
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateEmailVerificationToken')
  DROP PROCEDURE sp_CreateEmailVerificationToken;
GO

CREATE PROCEDURE sp_CreateEmailVerificationToken
  @user_id INT,
  @token NVARCHAR(255),
  @expires_in_hours INT = 24
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Deactivate old tokens
    UPDATE email_verification_tokens
    SET is_used = 1
    WHERE user_id = @user_id AND is_used = 0;
    
    -- Create new token
    INSERT INTO email_verification_tokens (user_id, token, expires_at)
    VALUES (@user_id, @token, DATEADD(HOUR, @expires_in_hours, GETDATE()));
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_CreateEmailVerificationToken created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 9: Verify Email Token
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_VerifyEmailToken')
  DROP PROCEDURE sp_VerifyEmailToken;
GO

CREATE PROCEDURE sp_VerifyEmailToken
  @token NVARCHAR(255),
  @user_id INT OUTPUT,
  @is_valid BIT OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    SELECT @user_id = user_id
    FROM email_verification_tokens
    WHERE token = @token 
      AND is_used = 0 
      AND expires_at > GETDATE();
    
    IF @user_id IS NOT NULL
    BEGIN
      SET @is_valid = 1;
      
      -- Mark token as used
      UPDATE email_verification_tokens
      SET is_used = 1, used_at = GETDATE()
      WHERE token = @token;
      
      -- Update user email verification status
      UPDATE users_enhanced
      SET is_email_verified = 1, email_verified_at = GETDATE()
      WHERE id = @user_id;
      
      -- Log activity
      INSERT INTO user_activity_log (user_id, activity_type, description)
      VALUES (@user_id, 'EMAIL_VERIFIED', 'Email verified successfully');
    END
    ELSE
    BEGIN
      SET @is_valid = 0;
    END
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_VerifyEmailToken created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 10: Create Password Reset Token
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreatePasswordResetToken')
  DROP PROCEDURE sp_CreatePasswordResetToken;
GO

CREATE PROCEDURE sp_CreatePasswordResetToken
  @email NVARCHAR(100),
  @token NVARCHAR(255),
  @ip_address NVARCHAR(50) = NULL,
  @expires_in_hours INT = 1,
  @user_id INT OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    -- Get user ID
    SELECT @user_id = id FROM users_enhanced WHERE email = @email;
    
    IF @user_id IS NULL
    BEGIN
      RETURN -1; -- User not found
    END
    
    -- Deactivate old tokens
    UPDATE password_reset_tokens
    SET is_used = 1
    WHERE user_id = @user_id AND is_used = 0;
    
    -- Create new token
    INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
    VALUES (@user_id, @token, DATEADD(HOUR, @expires_in_hours, GETDATE()), @ip_address);
    
    -- Log activity
    INSERT INTO user_activity_log (user_id, activity_type, description, ip_address)
    VALUES (@user_id, 'PASSWORD_RESET_REQUESTED', 'Password reset token created', @ip_address);
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_CreatePasswordResetToken created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 11: Reset Password
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_ResetPassword')
  DROP PROCEDURE sp_ResetPassword;
GO

CREATE PROCEDURE sp_ResetPassword
  @token NVARCHAR(255),
  @new_password_hash NVARCHAR(255),
  @ip_address NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;
    
    DECLARE @user_id INT;
    
    -- Verify token
    SELECT @user_id = user_id
    FROM password_reset_tokens
    WHERE token = @token 
      AND is_used = 0 
      AND expires_at > GETDATE();
    
    IF @user_id IS NULL
    BEGIN
      ROLLBACK TRANSACTION;
      RETURN -1; -- Invalid or expired token
    END
    
    -- Update password
    UPDATE users_enhanced
    SET password_hash = @new_password_hash,
        updated_at = GETDATE()
    WHERE id = @user_id;
    
    -- Mark token as used
    UPDATE password_reset_tokens
    SET is_used = 1, used_at = GETDATE()
    WHERE token = @token;
    
    -- Log activity
    INSERT INTO user_activity_log (user_id, activity_type, description, ip_address)
    VALUES (@user_id, 'PASSWORD_RESET', 'Password reset successfully', @ip_address);
    
    COMMIT TRANSACTION;
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_ResetPassword created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 12: Get All Users with Pagination
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GetAllUsers')
  DROP PROCEDURE sp_GetAllUsers;
GO

CREATE PROCEDURE sp_GetAllUsers
  @page_number INT = 1,
  @page_size INT = 10,
  @search_term NVARCHAR(100) = NULL,
  @is_active BIT = NULL,
  @total_count INT OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  
  DECLARE @offset INT = (@page_number - 1) * @page_size;
  
  -- Get total count
  SELECT @total_count = COUNT(*)
  FROM users_enhanced
  WHERE (@search_term IS NULL OR username LIKE '%' + @search_term + '%' 
         OR email LIKE '%' + @search_term + '%'
         OR first_name LIKE '%' + @search_term + '%'
         OR last_name LIKE '%' + @search_term + '%')
    AND (@is_active IS NULL OR is_active = @is_active);
  
  -- Get paginated results
  SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.is_active,
    u.is_email_verified,
    u.last_login_at,
    u.created_at,
    STRING_AGG(r.role_name, ',') AS roles
  FROM users_enhanced u
  LEFT JOIN user_role_mapping urm ON u.id = urm.user_id
  LEFT JOIN user_roles r ON urm.role_id = r.id
  WHERE (@search_term IS NULL OR u.username LIKE '%' + @search_term + '%' 
         OR u.email LIKE '%' + @search_term + '%'
         OR u.first_name LIKE '%' + @search_term + '%'
         OR u.last_name LIKE '%' + @search_term + '%')
    AND (@is_active IS NULL OR u.is_active = @is_active)
  GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.phone, 
           u.is_active, u.is_email_verified, u.last_login_at, u.created_at
  ORDER BY u.created_at DESC
  OFFSET @offset ROWS
  FETCH NEXT @page_size ROWS ONLY;
END
GO

PRINT 'Stored Procedure sp_GetAllUsers created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 13: Deactivate User
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_DeactivateUser')
  DROP PROCEDURE sp_DeactivateUser;
GO

CREATE PROCEDURE sp_DeactivateUser
  @user_id INT,
  @deactivated_by INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    UPDATE users_enhanced
    SET is_active = 0,
        updated_at = GETDATE(),
        updated_by = @deactivated_by
    WHERE id = @user_id;
    
    -- Deactivate all sessions
    UPDATE user_sessions
    SET is_active = 0
    WHERE user_id = @user_id;
    
    -- Log activity
    INSERT INTO user_activity_log (user_id, activity_type, description)
    VALUES (@user_id, 'ACCOUNT_DEACTIVATED', 'User account deactivated');
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_DeactivateUser created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 14: Create User Session
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CreateUserSession')
  DROP PROCEDURE sp_CreateUserSession;
GO

CREATE PROCEDURE sp_CreateUserSession
  @user_id INT,
  @session_token NVARCHAR(500),
  @ip_address NVARCHAR(50) = NULL,
  @user_agent NVARCHAR(500) = NULL,
  @device_type NVARCHAR(50) = NULL,
  @expires_in_hours INT = 24
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    
    INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, 
                               device_type, expires_at)
    VALUES (@user_id, @session_token, @ip_address, @user_agent, @device_type,
            DATEADD(HOUR, @expires_in_hours, GETDATE()));
    
    RETURN 0;
    
  END TRY
  BEGIN CATCH
    RETURN -999;
  END CATCH
END
GO

PRINT 'Stored Procedure sp_CreateUserSession created successfully';
GO

-- ============================================================
-- STORED PROCEDURE 15: Validate Session
-- ============================================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_ValidateSession')
  DROP PROCEDURE sp_ValidateSession;
GO

CREATE PROCEDURE sp_ValidateSession
  @session_token NVARCHAR(500),
  @user_id INT OUTPUT,
  @is_valid BIT OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT @user_id = user_id
  FROM user_sessions
  WHERE session_token = @session_token
    AND is_active = 1
    AND expires_at > GETDATE();
  
  IF @user_id IS NOT NULL
  BEGIN
    SET @is_valid = 1;
    
    -- Update last activity
    UPDATE user_sessions
    SET last_activity_at = GETDATE()
    WHERE session_token = @session_token;
  END
  ELSE
  BEGIN
    SET @is_valid = 0;
  END
END
GO

PRINT 'Stored Procedure sp_ValidateSession created successfully';
GO

-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT 'Enhanced User Signup System Created Successfully!';
PRINT '============================================================';
PRINT 'Tables Created: 7';
PRINT 'Stored Procedures Created: 15';
PRINT '============================================================';
PRINT '';
PRINT 'Tables:';
PRINT '  1. users_enhanced';
PRINT '  2. user_roles';
PRINT '  3. user_role_mapping';
PRINT '  4. email_verification_tokens';
PRINT '  5. password_reset_tokens';
PRINT '  6. user_sessions';
PRINT '  7. user_activity_log';
PRINT '';
PRINT 'Stored Procedures:';
PRINT '  1. sp_RegisterUser';
PRINT '  2. sp_UserLogin';
PRINT '  3. sp_UpdateLoginSuccess';
PRINT '  4. sp_UpdateLoginFailure';
PRINT '  5. sp_GetUserById';
PRINT '  6. sp_GetUserByEmail';
PRINT '  7. sp_UpdateUserProfile';
PRINT '  8. sp_CreateEmailVerificationToken';
PRINT '  9. sp_VerifyEmailToken';
PRINT ' 10. sp_CreatePasswordResetToken';
PRINT ' 11. sp_ResetPassword';
PRINT ' 12. sp_GetAllUsers';
PRINT ' 13. sp_DeactivateUser';
PRINT ' 14. sp_CreateUserSession';
PRINT ' 15. sp_ValidateSession';
PRINT '============================================================';
GO

