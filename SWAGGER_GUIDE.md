# 📚 Cystra API - Swagger Documentation Guide

## 🎯 Quick Access

**Swagger UI URL:** [http://localhost:8081/api-docs](http://localhost:8081/api-docs)

## 🌟 Features

Your Cystra API now has interactive Swagger documentation with:

✅ **Interactive Testing** - Try API endpoints directly from the browser  
✅ **Authentication Support** - Built-in JWT token authorization  
✅ **Request/Response Schemas** - See exactly what data to send and expect  
✅ **Try It Out** - Execute real API calls with sample data  
✅ **OpenAPI 3.0 Standard** - Industry-standard API documentation  

## 📋 Available Endpoints

### Authentication Tag
- **POST** `/api/v1/auth/register` - Register a new user
- **POST** `/api/v1/auth/login` - Login and get JWT token
- **GET** `/api/v1/auth/me` - Get current user profile (Protected)

### Users Tag
- **GET** `/api/v1/users` - Get all users (Protected)
- **GET** `/api/v1/users/{id}` - Get user by ID (Protected)
- **PUT** `/api/v1/users/{id}` - Update user (Protected)
- **DELETE** `/api/v1/users/{id}` - Delete user (Protected)

## 🔐 How to Test with JWT Authentication

### Step 1: Register or Login
1. In Swagger UI, expand **POST /api/v1/auth/register** or **POST /api/v1/auth/login**
2. Click **"Try it out"**
3. Enter sample data:
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```
4. Click **"Execute"**
5. Copy the `token` from the response

### Step 2: Authorize
1. Click the **"Authorize"** 🔒 button at the top of Swagger UI
2. In the "Value" field, enter: `Bearer YOUR_TOKEN_HERE`
   (Replace YOUR_TOKEN_HERE with the actual token)
3. Click **"Authorize"**
4. Click **"Close"**

### Step 3: Test Protected Endpoints
Now you can test any protected endpoint (marked with 🔒):
- GET /api/v1/users
- GET /api/v1/users/{id}
- PUT /api/v1/users/{id}
- DELETE /api/v1/users/{id}

## 🎨 Swagger UI Interface

When you open [http://localhost:8081/api-docs](http://localhost:8081/api-docs), you'll see:

- **Header** - API title, version, and description
- **Authorize Button** 🔒 - Click here to add JWT token
- **Tags** - Organized endpoint groups (Authentication, Users)
- **Endpoints** - Each with method, path, and description
- **Try it out** - Interactive testing buttons
- **Schemas** - Request/response data structures

## 📝 Example Workflow

```bash
1. Register User
   POST /api/v1/auth/register
   Body: { name, email, password }
   Response: { userId, token }

2. Copy Token
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

3. Authorize
   Click 🔒 → Enter "Bearer <token>" → Authorize

4. Test Protected Endpoints
   GET /api/v1/users (now works with your token)
```

## 🛠️ Customizing Swagger

The Swagger configuration is in `server.js`:

```javascript
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cystra API",
      version: "1.0.0",
      description: "API documentation for Cystra backend system"
    },
    // ... more configuration
  },
  apis: ["./server.js", "./routes/*.js", "./controllers/*.js"]
};
```

## 📖 Adding More Documentation

To add Swagger docs to new endpoints, use JSDoc comments in route files:

```javascript
/**
 * @swagger
 * /api/v1/your-endpoint:
 *   get:
 *     summary: Your endpoint description
 *     tags: [YourTag]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/your-endpoint', controller.yourMethod);
```

## 🎯 Benefits

- **No Postman needed** - Test directly in browser
- **Auto-updated** - Documentation stays in sync with code
- **Shareable** - Send URL to team members
- **Professional** - Industry-standard OpenAPI format
- **Easy Testing** - No need to manually set headers

## 🚀 Live Now!

Your Swagger documentation is live at:
**http://localhost:8081/api-docs**

Happy Testing! 🎉

