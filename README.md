# Nalmart Core API

Comprehensive E-commerce backend with Order Management System (OMS) and Role-Based Access Control (RBAC).

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MySQL 8.0 with Sequelize ORM
- **Caching**: Redis (ioredis)
- **Authentication**: JWT with bcrypt
- **File Storage**: AWS S3
- **Testing**: Jest & Supertest
- **Code Quality**: ESLint & Prettier

## Project Structure

```
src/
├── config/          # Configuration files (database, redis, aws, env)
├── controllers/     # Request handlers
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware (auth, rbac, validation, error handling)
├── services/        # Business logic services
├── utils/           # Utility functions (logger, errors, response)
├── types/           # TypeScript type definitions
├── validators/      # Request validation schemas
├── seeds/           # Database seeders
└── app.ts           # Application entry point
```

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Environment Variables

Edit the `.env` file and update the following:

**Database Configuration:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nalmart_dev
DB_USER=root
DB_PASSWORD=your_mysql_password  # Required!
```

**AWS S3 Configuration (optional for now):**
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 3. Create Database

Create the MySQL database:

```bash
# Using Docker MySQL
docker exec -it <mysql_container_name> mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nalmart_dev;"

# Or using MySQL CLI
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nalmart_dev;"
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm test:watch` - Run tests in watch mode
- `npm test:coverage` - Run tests with coverage

## API Endpoints

### Health Check
- `GET /health` - Check API status

More endpoints will be added as development progresses.

## Current Status

✅ Week 1 Complete - Project Foundation
- Development environment setup
- Project structure created
- TypeScript, ESLint, Prettier configured
- Express server with middleware
- Database connection (Sequelize)
- Redis connection configured
- Logging system (Winston)
- Error handling middleware
- Environment configuration

## Next Steps (Week 2)

1. Create database models (User, Role, Permission, etc.)
2. Implement authentication system (JWT)
3. Build RBAC middleware
4. Set up AWS S3 file upload service
5. Create API endpoints for authentication

## Connection Test Results

- ✅ Redis: Connected successfully
- ⚠️ MySQL: Requires password configuration in `.env`

Please update your `.env` file with the correct MySQL credentials and restart the server.

## License

ISC
