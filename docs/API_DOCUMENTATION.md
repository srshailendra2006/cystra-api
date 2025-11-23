# Cystra API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_token>
```

---

## Endpoints

### Authentication

#### Register User
**POST** `/auth/register`

Request Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "userId": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
**POST** `/auth/login`

Request Body:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Current User
**GET** `/auth/me`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### Users

#### Get All Users
**GET** `/users`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "status": "success",
  "results": 2,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get User by ID
**GET** `/users/:id`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update User
**PUT** `/users/:id`

Headers:
```
Authorization: Bearer <token>
```

Request Body:
```json
{
  "name": "John Updated",
  "email": "johnupdated@example.com"
}
```

Response:
```json
{
  "status": "success",
  "message": "User updated successfully"
}
```

#### Delete User
**DELETE** `/users/:id`

Headers:
```
Authorization: Bearer <token>
```

Response:
```json
{
  "status": "success",
  "message": "User deleted successfully"
}
```

---

## Error Responses

All error responses follow this format:
```json
{
  "status": "error",
  "message": "Error message here"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

