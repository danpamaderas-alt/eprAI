# State Management — Multi-tenant Architecture

The application uses **Zustand** for state management, following a modular store pattern. Because the app is multi-tenant (one user can manage multiple companies), the state management must ensure absolute data isolation.

## 🏢 The Tenant Pattern

The source of truth for the active company is the `useTenantStore`.

### `useTenantStore.ts`
- **State**: `activeCompanyId: string | null`.
- **Action**: `setActiveCompany(id: string)`.

### Data Isolation Logic
To prevent data leaks when switching companies, every data-bearing store (e.g., `useOrderStore`, `useInventoryStore`) must follow the **Subscription Pattern**:

```typescript
useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useDataStore.setState({ 
      data: [], 
      isLoading: false 
    });
  }
});
```

**Why this is critical:** 
Zustand stores are singletons. If a user switches from "Company A" to "Company B" without resetting the state, the UI would continue to show Company A's data until a new fetch is completed, leading to potential data leaks and UI glitches.

---

## 📦 Store Hierarchy

### 1. Global Stores (`src/store/`)
- **`useAuthStore`**: Session management, user profile, and authentication status.
- **`useTenantStore`**: Active company context.
- **`useThemeStore`**: Light/Dark mode preferences.
- **`useToastStore`**: Global notification system (SweetAlert2 integration).

### 2. Module-Specific Stores (`src/modules/*/store/`)
Each module (Orders, CRM, Inventory, etc.) has its own store to keep the state lean.
- **Pattern**: 
  - `fetchX()`: Fetches data from Supabase using the `activeCompanyId`.
  - `addX()`, `updateX()`, `deleteX()`: Performs mutations and updates the local state.
- **Example**: `useOrderStore` handles all the complex logic for partial deliveries and order status transitions.

## 🛠 Best Practices for New Stores
When creating a new store:
1. **Always** implement the `useTenantStore` subscription to reset data on company change.
2. **Always** fetch data based on the `activeCompanyId`.
3. **Prefer** local state for forms and global stores for shared data.
4. **Avoid** putting large binary data (like images) in the store; store references and use a hook like `useImageSrc` for rendering.
