# Technical Architecture — Raíces ERP (eprAI)

## 📌 Project Overview
**Raíces ERP** is a specialized internal management system designed for a sublimation and 3D printing business. It handles the entire production lifecycle: from client quoting and design repository management to production queues and financial tracking.

## 🛠 Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4.
- **State Management**: Zustand (Store-per-module pattern).
- **Backend/Database**: Supabase (PostgreSQL + Auth + Storage).
- **Edge Computing**: Cloudflare Workers (Proxy for AI and scrapers).
- **AI Integration**: Google Gemini (Image editing, background removal, client analysis).
- **Testing**: Vitest.

## 🗺 Code Structure & Modules

### 1. Core Modules (`src/modules/`)
- **`orders/`**: Manages client orders. Implements a complex "Partial Delivery" system where quantities are tracked per variant within a JSONB field.
- **`printjobs/`**: 3D printing queue. Tracks real material consumption (grams) from the filament inventory upon job completion.
- **`sublimation/`**: Design repository. Includes a **Print Preflight** system that validates image DPI against product presets before allowing production.
- **`quotes/` & `finances/`**: Cost calculators and treasury. Calculates real margins vs. target margins and tracks company cash flow.
- **`crm/`**: Client management. Includes an AI-powered analysis tool and an Omnichannel Inbox for communication tracking.

### 2. Shared Infrastructure (`src/shared/`)
- **`lib/supabase.ts`**: Single point of entry for Supabase client configuration.
- **`store/useTenantStore.ts`**: The heart of the multi-tenant system. Manages the `activeCompanyId` which filters all data across the app.
- **`utils/`**: Logic for signed storage URLs, rate limiting, and formatters.

### 3. The Worker Proxy (`src/worker.ts`)
Because the frontend cannot safely store API keys or handle complex scraping, a Cloudflare Worker acts as a secure proxy:
- **`/api/gemini`**: Secure proxy to Google AI.
- **`/api/scrape-3d` / `/api/scrape-sublimation`**: Extracts metadata from platforms like MakerWorld or Creative Fabrica.
- **`/api/design-tools`**: Handles image processing (Background removal, Mockups) using Gemini's image-to-image capabilities.

## 🔌 Key Connections & Data Flow

### Data Isolation (Multi-tenancy)
The system uses a "Shared Database, Separate Schema" approach via **Row Level Security (RLS)**:
1. User logs in $\rightarrow$ `useAuthStore` stores the session.
2. `useTenantStore` sets the `activeCompanyId`.
3. Every Supabase query includes `.eq('company_id', activeCompanyId)`.
4. Database Policies (RLS) ensure that even if the frontend is bypassed, a user cannot access data from another company.

### Design Image Pipeline
To optimize storage and performance:
- Images are stored in a private Supabase Storage bucket.
- `useImageSrc` hook generates a **Signed URL** (valid for 1 hour) on-demand.
- Heavy operations (like vectorization) are offloaded to a **Web Worker** to prevent UI freezing.

### Financial Logic
- **Atomic Operations**: Uses Postgres RPCs (Stored Procedures) for stock updates to prevent "race conditions" (TOCTOU) when multiple users complete jobs simultaneously.
- **Treasury**: All movements (Income/Expense) are linked to a `company_id` and categorized by business unit.

## 🚀 Development Quick-start
1. Install dependencies: `npm install`.
2. Configure environment: Copy `.env.example` to `.env` (Keys for Supabase and Gemini).
3. Run dev server: `npm run dev` $\rightarrow$ `http://localhost:2026`.
4. Run tests: `npm test`.
