# Testing Authentication Endpoints

This document provides quick test examples for the authentication system.

## Prerequisites

1. Ensure MongoDB is running
2. Start the server: `npm run dev`
3. API will be available at `http://localhost:3000`

## Test Endpoints

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "StrongPass123!",
    "role": "user"
  }'
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "_id": "...",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false
    }
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "johndoe",
    "password": "StrongPass123!"
  }'
```

### 3. Get Profile (Protected)

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 4. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## Using Swagger UI

Visit `http://localhost:3000/api-docs` for interactive API testing.
