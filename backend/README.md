# Yemeni Store Backend (Node.js)

This is the Node.js/Express backend for the Yemeni E-commerce store, converted from the original C#/.NET backend while preserving all functionality and logic. This version is adapted for Vercel deployment using serverless functions.

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers (controllers)
│   ├── services/         # Business logic
│   ├── repositories/     # Data access layer
│   ├── models/           # Database models (Prisma)
│   ├── routes/           # API route definitions
│   ├── middleware/       # Custom middleware (auth, error handling)
│   └── utils/            # Utility functions
├── uploads/              # Uploaded product images
├── prisma/               # Prisma schema and migrations
│   └── schema.prisma     # Database schema
├── .env.example          # Environment variables template
├── vercel.json           # Vercel configuration
├── server.js             # Express app (serverless compatible)
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend root directory based on `.env.example`:
   ```
   PORT=5000
   DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
   JWT_SECRET=your_jwt_secret_here_change_in_production
   JWT_EXPIRES_IN=1h
   USD_TO_YER_SANAA_RATE=530
   USD_TO_YER_ADEN_RATE=1650
   ```

4. Make sure you have a Supabase PostgreSQL database set up (see DATABASE_MIGRATION.md for details).

## Running Locally

### Development Mode
```bash
npm run dev
```
This will start the server with nodemon for automatic restarts on file changes.

### Production Mode
```bash
npm start
```
This will start the server in production mode.

## Vercel Deployment

This backend is configured to run as a serverless function on Vercel.

### Step-by-Step Deployment:

1. **Install Vercel CLI** (if you don't have it):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the backend directory**:
   ```bash
   cd backend
   vercel
   ```

4. **Follow the prompts**:
   - Set up a new project or link to an existing one
   - Confirm the project name and directory
   - Vercel will automatically detect the Node.js project and use the `vercel.json` configuration

5. **Set Environment Variables in Vercel Dashboard**:
   After deployment, go to your project settings in the Vercel dashboard and add:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `JWT_SECRET`: Your JWT secret
   - `JWT_EXPIRES_IN`: JWT expiration time (e.g., "1h")
   - `USD_TO_YER_SANAA_RATE`: Exchange rate for USD to YER Sanaa
   - `USD_TO_YER_ADEN_RATE`: Exchange rate for USD to YER Aden

### Alternative: Using Git Integration

1. Push your backend code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import the project to Vercel
3. Vercel will automatically detect it's a Node.js project and deploy it
4. Set the environment variables in the Vercel dashboard as described above

## API Endpoints

All API endpoints are available under the `/api` path:
- Products: `/api/products`
- Accounts: `/api/account` 
- Orders: `/api/orders`
- Admin: `/api/admin`
- Categories: `/api/categories`

Example: `https://your-project.vercel.app/api/products`

## Serverless Considerations

1. **Cold Starts**: Serverless functions may experience cold start latency. This is normal for Vercel deployments.
2. **File System**: The `/tmp` directory is the only writable area in serverless functions. Uploaded files are stored there temporarily.
3. **Database Connections**: Prisma optimizes connection pooling for serverless environments.
4. **Environment Variables**: All configuration is done through environment variables as shown above.

## Database Setup

See `DATABASE_MIGRATION.md` for detailed instructions on:
- Setting up Supabase PostgreSQL
- Running Prisma migrations
- Understanding the database schema
- Seeding initial data

## Frontend Integration

Your frontend should call the APIs using the Vercel deployment URL:
```javascript
// Example fetch request
const response = await fetch('https://your-project.vercel.app/api/products', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Include auth token if needed
    'Authorization': `Bearer ${token}`
  }
});
```

## Troubleshooting

1. **Database Connection Issues**: Verify your `DATABASE_URL` is correct and your Supabase database is accessible
2. **Build Failures**: Check that all dependencies are correctly listed in package.json
3. **Function Timeouts**: Optimize database queries and consider adding indexes for frequently queried fields
4. **File Upload Limits**: Vercel serverless functions have limitations on file size; consider using direct upload to storage services like AWS S3 or Cloudinary for production

## License

This project is adapted from the original C#/.NET Yemeni E-commerce store backend.