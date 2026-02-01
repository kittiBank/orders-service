# Orders Service REST API

REST API for Orders Management System built with NestJS, Prisma, PostgreSQL, and JWT Authentication.

## Features

- **Authentication**: Register, Login, Refresh Token, Logout
- **Role-Based Access Control (RBAC)**: Admin, Seller, Customer
- **Orders Management**: CRUD operations with soft delete
- **Advanced Filtering**: Search and filter with detailed options
- **Pagination**: Support for data pagination
- **Bulk Operations**: Update multiple orders at once
- **Rate Limiting**: Request throttling for security
- **Swagger Documentation** - Interactive API documentation

## Tech Stack

- **Back-end:** NestJS, Prisma, TypeScript, JWT
- **Database:** PostgreSQL on Docker
- **Other:** Docker, Swagger, Jest

## Prerequisites

Before running this project, must install this program:

- **Node.js**
- **Docker** and **Docker Compose** (for running the database)

---

## How to Run This Project

### Clone the Repository

```bash
git clone <https://github.com/kittiBank/orders-service.git>
cd orders-service
```

### Install Dependencies

```bash
npm install
```

### Start PostgreSQL Database with Docker

```bash
docker-compose up -d
```

Check if the database is running:
- **PostgreSQL**: `localhost:5432`
- **pgAdmin**: `http://localhost:5050` (email: `admin@admin.com`, password: `admin`)

### Run Prisma Migrations

```bash
npx prisma migrate dev
```

### Setup pgAdmin (First Time only)

```bash
1. **Open pgAdmin** in your browser at `http://localhost:5050`

2. **Login to pgAdmin**
   - Email: `admin@admin.com`
   - Password: `admin`

3. **Configure Connection**
   In the "General" tab:
   - Name: `Orders DB` 

   In the "Connection" tab:
   - Host name/address: `postgres`
   - Port: `5432`
   - Maintenance database: `orders_db`
   - Username: `postgres`
   - Password: `postgres`
```


### Start the Application

```bash
# Development mode (auto-reload)
npm run start:dev
```

The application will be running at: **http://localhost:3000**

Swagger API Documentation: **http://localhost:3000/api/docs**

Postman collention for import endpoint:
- Authen Collection: https://drive.google.com/file/d/1mUIKyEPSZ6jkC1zf5FZ-5YIUJAAQjWLV/view?usp=share_link
- Order Collection: https://drive.google.com/file/d/1gLBC4mzSntikhww3EnFOI1wZWA0Dgwfa/view?usp=share_link

---

## API Endpoints

### Authentication Endpoints


| Method | Endpoint | Description | Auth Required | Rate Limit |
|--------|----------|-------------|---------------|------------|
| `POST` | `/api/v1/auth/register` | Register new user | - | 3/min |
| `POST` | `/api/v1/auth/login` | User login | - | 5/min |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | - | 10/min |
| `POST` | `/api/v1/auth/logout` | User logout | Bearer token | No limit |
| `GET` | `/api/v1/auth/profile` | Get user profile | Bearer token | No limit |
| `POST` | `/api/v1/auth/revoke-token` | Revoke specific token | Bearer token | 10/min |
| `POST` | `/api/v1/auth/revoke-all-tokens` | Revoke all user tokens | Bearer token | 5/min |

### Orders Endpoints

| Method | Endpoint | Description | Auth Required | Role | Rate Limit |
|--------|----------|-------------|---------------|------|------------|
| `GET` | `/api/v1/orders` | List orders (with filters & pagination) | Bearer token | All | 100/min |
| `GET` | `/api/v1/orders/:id` | Get single order | Bearer token | All | 100/min |
| `POST` | `/api/v1/orders` | Create new order | Bearer token | All | 20/min |
| `PATCH` | `/api/v1/orders/:id` | Update order | Bearer token | All* | 30/min |
| `PATCH` | `/api/v1/orders/bulk` | Bulk update orders | Bearer token | Admin, Seller | 10/min |
| `DELETE` | `/api/v1/orders/:id` | Delete order (soft delete) | Bearer token | Admin | 10/min |

**Note:** Customers can only update their own orders with `PENDING` status.

---

## Role-Based Access Control (RBAC)

### User Roles

| Role | Username | Description | Permissions |
|------|----------|-------------|-------------|
| **ADMIN** | admin | System administrator | Full access to all resources |
| **SELLER** | seller | Seller | Manage all orders, cannot delete |
| **CUSTOMER** | customer | Customer | Manage only their own orders |


---

## Database Schema

### Users Table
```sql
- id: UUID (Primary Key)
- email: String (Unique)
- password: String (Hashed)
- name: String (Optional)
- role: Enum (ADMIN, SELLER, CUSTOMER)
- refreshToken: String (Hashed)
- createdAt: DateTime
- updatedAt: DateTime
```

### Orders Table
```sql
- id: UUID (Primary Key)
- customerId: String
- items: JSON (Array of OrderItems)
- subtotal: Decimal
- shippingFee: Decimal
- total: Decimal
- status: Enum (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
- shippingAddress: JSON
- note: String (Optional)
- createdAt: DateTime
- updatedAt: DateTime
- deletedAt: DateTime (Soft Delete)
```

### Order Status Flow
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
   ↓          ↓            ↓           ↓
CANCELLED  CANCELLED   CANCELLED   CANCELLED
```

---

## Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

--
## Screenshot

- API Testing

<img width="600" height="400" alt="image" src="https://github.com/user-attachments/assets/9842e28a-0076-4047-8442-3d26ba6eb689" />

- Database Schema

<img width="600" height="400" alt="image" src="https://github.com/user-attachments/assets/b94e216e-16db-4678-b0b0-2b7133fa2603" />

- Swagger API Document

<img width="600" height="300" alt="Screenshot 2569-02-01 at 12 01 01" src="https://github.com/user-attachments/assets/ef65bb33-b64e-473f-891b-6f7f9fa6541b" />




  

