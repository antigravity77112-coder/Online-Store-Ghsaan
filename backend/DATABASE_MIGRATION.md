# Database Migration: SQL Server to Supabase PostgreSQL with Prisma

This document explains how the database was migrated from SQL Server (Entity Framework Core) to Supabase PostgreSQL using Prisma ORM.

## Overview

The original C# backend used Entity Framework Core with SQL Server. This Node.js version uses Prisma ORM with PostgreSQL hosted on Supabase.

## Prisma Schema

The `prisma/schema.prisma` file defines the database structure:
- All tables from the original SQL Server database are represented as Prisma models
- All relationships are preserved using Prisma's relation syntax
- All constraints (unique, required fields) are maintained
- Enums match the original C# versions exactly
- Soft delete pattern is implemented using the `isHidden` boolean field on Product

## Setting Up Supabase

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Get your database connection string from:
   - Project Settings → Database → Connection URI
   - Use the PostgreSQL URI format
4. Set the `DATABASE_URL` environment variable in your `.env` file

## Prisma Commands

### Generate Prisma Client
```bash
npx prisma generate
```

### Push Schema to Supabase
```bash
npx prisma db push
```

### Create Migration Files
```bash
npx prisma migrate dev --name init
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```

### Open Prisma Studio (GUI)
```bash
npx prisma studio
```

## Environment Variables

See `.env.example` for required variables:
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token generation
- `JWT_EXPIRES_IN`: JWT expiration time
- `USD_TO_YER_SANAA_RATE`: Exchange rate for USD to YER Sanaa
- `USD_TO_YER_ADEN_RATE`: Exchange rate for USD to YER Aden

## Data Types Mapping

| C# (.NET) Type | PostgreSQL Type | Prisma Type |
|----------------|----------------|-------------|
| Guid           | UUID           | String @db.Uuid |
| string         | TEXT           | String |
| decimal        | DECIMAL(18,2)  | Decimal @db.Decimal(18, 2) |
| int            | INTEGER        | Int |
| bool           | BOOLEAN        | Boolean |
| DateTime       | TIMESTAMPTZ    | DateTime |
| Enums          | TEXT           | Enum (in Prisma) |

## Relationships Preserved

All original relationships are maintained:
- User ←(one-to-many)→ Product (as seller)
- User ←(one-to-many)→ Order (as buyer)
- Category ←(one-to-many)→ Product
- Order ←(one-to-many)→ OrderItem
- Product ←(one-to-many)→ OrderItem

## Indexes

Indexes from the original database are preserved:
- Unique index on User.phoneNumber
- Indexes on foreign keys for performance
- Additional indexes on frequently queried fields

## Notes

1. The `isHidden` field on Product implements soft delete pattern instead of hard delete
2. Prisma automatically adds `createdAt` and `updatedAt` timestamps (matching original behavior)
3. UUIDs are used for all ID fields to match the original GUID usage
4. Currency and other enums are implemented as Prisma enums to ensure type safety
5. Decimal precision is maintained at (18,2) for monetary values

## Verification

After running `prisma db push` or `prisma migrate dev`, you can verify the schema in:
1. Supabase dashboard → Table Editor
2. Prisma Studio (`npx prisma studio`)
3. By checking that all constraints and relationships are correctly applied