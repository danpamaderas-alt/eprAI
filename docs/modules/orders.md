# Orders Module

The Orders module is the core operational hub of Raíces ERP. It manages the lifecycle of a customer's request from the initial order to final delivery.

## 📦 Order Data Structure

Orders are stored in Supabase. A critical part of the schema is the `items` column, which is a **JSONB** array. This allows each order to have a variable number of products, each with its own set of variants (size, color).

### The Normalization Pipeline
Due to legacy data and evolving requirements, the system uses a **Normalization Pipeline** (`src/modules/orders/utils/orderItems.ts`) to handle two different JSON structures:
- **Canonical Form**: High-precision tracking of `quantityOrdered` and `quantityDelivered`.
- **Legacy Form**: Simpler structures from earlier versions.

Every time the app reads an order, it passes the `items` through `normalizeOrderItems()` to ensure a consistent interface for the UI.

## 🚚 Partial Delivery System

One of the most complex features of the project is the ability to perform **Partial Deliveries**.

### How it works:
1. **Delivery Target**: When marking items as delivered, the user specifies a `DeliveryTarget` (Item ID, Variation ID, and Quantity).
2. **Atomic Application**: The `applyDeliveriesToItems` utility calculates the new `quantityDelivered` for each variant, ensuring it never exceeds the `quantityOrdered`.
3. **Status Derivation**: The order status is automatically derived:
   - `PENDING`: 0 items delivered.
   - `PARTIAL`: Some items delivered, but not all.
   - `DELIVERED`: All ordered quantities have been delivered.

## 🖼 Design Integration
Orders are tightly coupled with the **Sublimation Module**.
- **Design Link**: An order can be linked to a design from the repository.
- **Preflight Check**: Before an order is moved to production, the system checks the design's DPI (Resolution). If the resolution is too low, it triggers a warning, and the order requires explicit client approval (`design_client_approved`) before it can proceed.

## 🚀 Key Components
- **`OrdersDashboard`**: The main view with Kanban, Calendar, and List modes.
- **`OrderForm`**: Interface for creating orders with dynamic variant addition.
- **`RemitoModal`**: Generates delivery notes (Remitos) for partial or full shipments.
- **`OrderMatrixModal`**: A spreadsheet-like interface for bulk-editing quantities across multiple orders.
