# Loan Ledger (INR)

A clean, offline-first web application to calculate outstanding loan balances and view amortization ledgers with flexible repayment options. Optimized for the Indian context (₹).

## Features

- **Pure Ledger Logic**: Calculates outstanding balance from the "Start Date" up to "Today". No assumptions about tenure.
- **Flexible Repayments**: Add any number of **Recurring** (monthly/yearly) or **One-time** payments.
- **Detailed Amortization Table**: View a chronological ledger of how your payments affect the principal and interest.
    - *Smart Filtering*: Rows with no activity are automatically hidden.
- **Indian Rupees (₹)**: All currency formatting uses the Indian numbering system (e.g., ₹1,00,000).
- **Configurable Interest**: Support for Monthly or Yearly interest compounding.
- **Privacy First**: Runs entirely in your browser. No data is sent to any server.

## How to Run

Since this is a static web application, you don't need any special software or `npm` commands.

1. **Download** or **Clone** this repository.
2. Navigate to the folder.
3. Double-click **`index.html`** to open it in your web browser.

## Customization

You can edit the source files directly:
- `index.html`: Structure and UI components.
- `style.css`: Styling and themes (Dark mode by default).
- `script.js`: Calculation logic and state management.

## Usage

1. **Enter Loan Details**:
    - Principal Amount (₹)
    - Interest Rate (% per annum)
    - Start Date
2. **Add Repayments**:
    - Click "Recurring" or "One-time" to toggle mode.
    - Enter Amount and Date.
    - Click "Add Payment".
3. **View Results**:
    - The top section shows the **Outstanding Balance** as of today.
    - The **Amortization Ledger** table below shows the full history.
