# Finances & Treasury Module

The Finance module handles the economic health of the business, focusing on cost calculation, margin analysis, and cash flow tracking.

## 💰 Cost Calculator (Quotes)

The system features a sophisticated cost calculator used to generate quotes.

### Calculation Logic
Instead of simple pricing, the calculator considers:
- **Base Cost**: Material cost (e.g., the cost of a blank mug or a t-shirt).
- **Consumables**: Ink, paper, and electricity.
- **Operational Costs**: Machine amortization and labor time.
- **Marginal Analysis**: A "Traffic Light" system (Green/Yellow/Red) indicates if the final price meets the target profit margin.

## 🏦 Treasury & Cash Flow

The Treasury system tracks every movement of money in the company.

### Transaction Management
Transactions are categorized as `INCOME`, `EXPENSE`, or `TRANSFER`.
- **Atomic Transfers**: Transfers between accounts are handled as a pair of complementary transactions (Expense from A, Income to B) to maintain balance.
- **Payment Resolution**: Supports a "Pending" $\rightarrow$ "Completed" workflow for tracking debts and payments.

### Financial Isolation
All financial data is strictly filtered by `company_id`. The `useTreasuryStore` ensures that treasury reports and dashboards only show data for the active tenant.
