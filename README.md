# Cystra API

A professional Node.js REST API backend with SQL database integration, following a clean architecture pattern with repositories, services, and controllers.

## 🚀 Features

- **Express.js** - Fast, unopinionated web framework
- **MySQL** - SQL database support
- **JWT Authentication** - Secure token-based authentication
- **Clean Architecture** - Repository, Service, Controller pattern
- **Swagger Documentation** - Interactive API documentation with Swagger UI
- **Security** - Helmet, CORS, bcrypt password hashing
- **Logging** - Morgan HTTP request logger
- **Error Handling** - Centralized error handling

## 📁 Project Structure

```
cystra-api/
├── contracts/
│   └── ApiRoutes.js          # Main API route definitions
├── controllers/
│   ├── authController.js     # Authentication controller
│   └── userController.js     # User controller
├── db/
│   └── schema.sql            # Database schema
├── docs/
│   └── API_DOCUMENTATION.md  # API documentation
├── models/
│   └── User.js               # User model
├── repositories/
│   └── userRepository.js     # User data access layer
├── routes/
│   ├── authRoutes.js         # Auth routes
│   └── userRoutes.js         # User routes
├── services/
│   ├── authService.js        # Authentication business logic
│   └── userService.js        # User business logic
├── utils/
│   ├── errorHandler.js       # Error handling utilities
│   └── responseHelper.js     # Response formatting helpers
├── .env.example              # Environment variables template
├── .gitignore
├── db.js                     # Database connection
├── package.json
├── README.md
└── server.js                 # Application entry point
```

## 🛠️ Installation

### Prerequisites

- Node.js (v14 or higher)
- MySQL
- npm or yarn

### Steps

1. **Navigate to project directory**

```bash
cd "Cystra API Code"
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cystra_db

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

CORS_ORIGIN=*
```

4. **Create database**

Run the SQL schema file:

```bash
mysql -u root -p < db/schema.sql
```

5. **Start the server**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will start on `http://localhost:8080` (or the port specified in `.env`)

## 📚 API Documentation

**Swagger UI** is available at: **http://localhost:8080/api-docs**

Interactive API documentation where you can:
- View all available endpoints
- Test APIs directly from the browser
- See request/response schemas
- Authenticate with JWT tokens

See [SWAGGER_GUIDE.md](./SWAGGER_GUIDE.md) for detailed instructions.

## 📝 API Endpoints

### Health Check
- `GET /health` - Check API status

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user (Protected)

### Users
- `GET /api/v1/users` - Get all users (Protected)
- `GET /api/v1/users/:id` - Get user by ID (Protected)
- `PUT /api/v1/users/:id` - Update user (Protected)
- `DELETE /api/v1/users/:id` - Delete user (Protected)

See [API Documentation](./docs/API_DOCUMENTATION.md) for detailed endpoint information.

## 🏗️ Architecture

This project follows a clean architecture pattern with separation of concerns:

### Layers

1. **Routes** (`routes/`) - Define API endpoints and HTTP methods
2. **Controllers** (`controllers/`) - Handle HTTP requests and responses
3. **Services** (`services/`) - Contain business logic
4. **Repositories** (`repositories/`) - Handle data access and database queries
5. **Models** (`models/`) - Define data structures

### Flow

```
Request → Routes → Controllers → Services → Repositories → Database
                                      ↓
Response ← Controllers ← Services ← Repositories
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 📊 Example Usage

### Register User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get All Users

```bash
curl -X GET http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer <your_token>"
```

## 🧪 Testing

```bash
npm test
```

## 📦 Dependencies

- **express** - Web framework
- **mysql2** - MySQL client
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **swagger-ui-express** - Swagger UI interface
- **swagger-jsdoc** - OpenAPI documentation
- **cors** - CORS middleware
- **helmet** - Security middleware
- **morgan** - HTTP logger
- **dotenv** - Environment variables

## 🚀 Deployment

### Environment Variables

Ensure all environment variables are set in production:
- Set `NODE_ENV=production`
- Use a strong `JWT_SECRET`
- Configure proper database credentials
- Set appropriate `CORS_ORIGIN`

### Production Tips

1. Use a process manager like PM2
2. Set up proper logging
3. Enable HTTPS
4. Set up database backups
5. Implement rate limiting
6. Use environment-specific configurations

## 📄 License

ISC

## 👥 Author

Cystra Technologies

---

**Happy Coding! 🎉**
