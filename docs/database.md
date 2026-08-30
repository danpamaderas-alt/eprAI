# Database Documentation

The project uses **Supabase (PostgreSQL)** as its primary data store. The architecture relies heavily on **RLS (Row Level Security)** to maintain multi-tenancy.

## 🏗 Schema Overview

### Core Tables
- **`companies`**: The top-level entity. Everything in the DB belongs to a company.
- **`customers`**: Client data. Linked to `companies`.
- **`products` & `product_variants`**: The product catalog. Variants handle sizes and colors.
- **`orders`**: Order headers. Contains a `items` JSONB column for flexible product lists.
- **`treasury`**: Financial transactions (Income/Expense).
- **`sublimation_designs`**: Metadata for designs, including a reference to a private Storage bucket.
- **`print_jobs_3d`**: Queue for 3D prints. Linked to models and filament stock.

### Storage Buckets
The system uses two main private buckets:
1. **`design-images`**: Stores the actual sublimation graphics.
2. **`print-files`**: Stores STL and G-code files for 3D printing.

## 🛡 Security & Multi-tenancy (RLS)

Instead of filtering data in the application layer, the database enforces isolation at the engine level using **Row Level Security**.

### The `user_company_id()` Function
The system uses a custom database function `private.user_company_id()` that extracts the company ID from the user's JWT claim.

### Example Policy
Every table has policies similar to this:
```sql
CREATE POLICY "Users can only access their company's data" 
ON public.orders
FOR ALL 
USING (company_id = private.user_company_id());
```

This means that even if a user manually calls the Supabase API, they can **never** read or write data belonging to another company.

## ⚙️ Migrations
Database changes are managed via numbered SQL files in the `sql/` directory.
- **Application**: Migrations are applied via the Supabase Management API.
- **Atomicity**: Critical stock updates use **Postgres RPCs** (Stored Procedures) with row-level locks to prevent race conditions.
