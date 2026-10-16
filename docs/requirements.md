# ACME Salary Management System — Requirements & Specification

## 1. Executive Summary & Objective

The **ACME Salary Management System** is an enterprise-grade human resources and compensation analytics platform. It enables HR managers to maintain employee records, monitor payroll distribution, track regional salary bands, and analyze compensation metrics across multinational offices without compromising financial or statistical integrity.

The system handles a workforce of **10,000 employees** distributed across five international offices:
- **India (INR)**
- **United States (USD)**
- **United Kingdom (GBP)**
- **Germany (EUR)**
- **Singapore (SGD)**

A foundational design mandate of the platform is **strict currency safety**: the system never combines, averages, or cross-ranks nominal salary figures across different local currencies unless an explicit, documented conversion source is applied.

---

## 2. User Persona

### Primary Persona: Global HR & Compensation Manager

- **Name / Role**: Eleanor Vance, Director of Global People Operations & Compensation
- **Context**: Responsible for workforce planning, headcount budgeting, pay-equity compliance, and regional compensation reviews across 5 sovereign regions.
- **Goals**:
  - Maintain an accurate, up-to-date directory of all personnel with instant search and department/country filtering.
  - Perform employee lifecycle operations (onboarding new hires, updating promotion salaries, removing departed records).
  - Review country-specific compensation brackets (minimum, average, and maximum base salaries) to evaluate local market competitiveness.
  - Export custom slices of employee data to CSV for executive reporting and payroll processing.
- **Pain Points**:
  - Misleading global salary averages that naively blend different currencies (e.g., treating ₹100,000 INR as equivalent to $100,000 USD).
  - Cumbersome, un-styled browser forms that slow down repetitive HR updates.
  - Inability to perform bulk operations (such as multi-row export or batch deletions).

---

## 3. Functional Requirements

### 3.1 Employee Record Management (CRUD)
- **FR-1.1: Create Employee**:
  - The system shall allow authorized users to create a new employee record via a validated modal form.
  - Fields required:
    - `employee_code`: Unique identifier (1–20 characters, e.g., `ACME00123`).
    - `full_name`: Employee legal name (1–100 characters).
    - `department`: Chosen from pre-approved list (`Engineering`, `Human Resources`, `Finance`, `Sales`, `Marketing`, `Operations`).
    - `country`: Chosen from supported sovereign branches (`India`, `United States`, `United Kingdom`, `Germany`, `Singapore`).
    - `currency`: ISO 4217 code strictly tied to country (`INR`, `USD`, `GBP`, `EUR`, `SGD`).
    - `salary`: Positive numeric amount (`Decimal`, `gt=0`, up to 12 digits with 2 decimal places).
    - `hire_date`: Valid date string (ISO format `YYYY-MM-DD`).
  - The system shall reject duplicate employee codes with HTTP 409 Conflict.
- **FR-1.2: Read & Directory Browsing**:
  - The system shall provide a paginated list of employees with configurable page sizes (10, 20, 50 records per page).
  - Displays employee name, code badge, department badge, country with national flag, formatted local salary, and hire date.
- **FR-1.3: Update Employee**:
  - Users shall be able to edit existing employee records with real-time pre-population.
  - Updates must pass all schema validation rules.
- **FR-1.4: Delete Employee**:
  - Users shall be able to delete an individual employee record with explicit user confirmation.

### 3.2 Search & Filtering
- **FR-2.1: Omnisearch**:
  - Real-time, case-insensitive search by employee full name or employee code.
  - Integrated clear button (`X`) to quickly reset search input.
- **FR-2.2: Department Filter**:
  - Dropdown selector to filter the directory by any of the 6 core operational departments.
- **FR-2.3: Country Filter**:
  - Dropdown selector to filter the directory by sovereign country.
- **FR-2.4: Filter Reset**:
  - One-click "Clear filters" action when active criteria are applied.

### 3.3 Multi-Row Selection & Bulk Operations
- **FR-3.1: Row Selection Checkboxes**:
  - Individual checkboxes on each table row allowing multi-item selection.
  - Selected rows visually highlighted with distinct SaaS indigo tint (`#eef2ff`).
- **FR-3.2: Header Select-All & Indeterminate State**:
  - Header checkbox toggles selection for all visible items on the active page.
  - Supports visual `indeterminate` state when a partial subset of page records is selected.
- **FR-3.3: Global Bulk Bar**:
  - Floating action bar appears dynamically when `selectedCount > 0`.
  - Displays live count of selected employees.
  - "Select all N loaded employees" shortcut to expand selection across all fetched records.
- **FR-3.4: Bulk CSV Export**:
  - One-click export downloading a formatted `.csv` file containing ID, Code, Full Name, Department, Country, Currency, Salary, and Hire Date for all selected records.
- **FR-3.5: Bulk Delete**:
  - Confirmation-guarded batch deletion executing concurrent API delete requests and refreshing the dataset.

### 3.4 Currency-Safe Compensation Analytics
- **FR-4.1: Isolated Regional Aggregations**:
  - The backend shall compute metrics grouped strictly by `(country, currency)`.
  - Aggregations computed: Headcount (`employee_count`), local average (`average_salary`), minimum base (`minimum_salary`), and top band (`maximum_salary`).
- **FR-4.2: Zero Cross-Currency Blending**:
  - The system shall NEVER calculate a global average by summing or averaging raw salary amounts across different currencies.
  - Nominal currencies (INR, USD, GBP, EUR, SGD) are maintained in independent reporting silos.
- **FR-4.3: Interactive Currency / Country Selectors**:
  - Metric cards on Dashboard, Compensation, and Analytics tabs feature inline selectors allowing HR managers to switch between local currencies and inspect sovereign statistics.
- **FR-4.4: Visual Visualizations (Recharts)**:
  - Dashboard: Categorical bar chart showing average local salary per sovereign market with explicit currency tooltips.
  - Compensation: Comparative triple-bar chart visualizing Minimum vs. Average vs. Maximum bands per country.
  - Analytics: Departmental breakdowns and workforce distribution metrics.

### 3.5 Synthetic Data Seeding (10,000 Records)
- **FR-5.1: Seeding Script (`seed.py`)**:
  - Generates 10,000 synthetic employee records with balanced distribution across the 5 countries and 6 departments.
  - Generates deterministic unique codes (`ACME00001` through `ACME10000`).
  - Realistic salary ranges (30,000 to 150,000 nominal units) and diverse hire dates across ~7 years.
  - Idempotency guard: Skips execution if employees are already present in the database.

---

## 4. Non-Functional Requirements

### 4.1 Data Integrity & Safety
- **NFR-1.1: Currency Safety Guarantee**: Under no circumstances shall an unconverted average salary be presented as a global representative metric.
- **NFR-1.2: Relational Constraints**: Primary key indexing, unique constraint on `employee_code`, and non-nullable critical columns (`full_name`, `department`, `country`, `currency`, `salary`, `hire_date`).
- **NFR-1.3: Precision**: Salaries stored with `Numeric(12, 2)` precision in SQLAlchemy and `Decimal(gt=0)` in Pydantic, preventing IEEE 754 floating point rounding drift.

### 4.2 Performance & Scalability
- **NFR-2.1: Query Response Times**: Directory queries and analytics aggregations execute in < 50ms on SQLite with 10,000 records.
- **NFR-2.2: Database Indexing**: Dedicated B-Tree indexes on `employee_code`, `full_name`, `department`, and `country`.
- **NFR-2.3: Efficient Pagination**: Server-side limit/offset querying preventing memory exhaustion when handling 10,000+ entries.
- **NFR-2.4: Frontend Asset Optimization**: Production Vite bundle < 25KB CSS and fast bundle execution with tree-shaken Lucide icons and Recharts.

### 4.3 Design, Aesthetics & Usability
- **NFR-3.1: Enterprise SaaS Aesthetics**: Styled with modern typography (Inter), indigo/slate color tokens, dark navigation sidebar, clean white cards with 1px border lines, and subtle drop shadows.
- **NFR-3.2: Custom Form Controls**: All `<select>` elements use custom SVG vector chevrons and hover/focus rings (`appearance: none`), eliminating outdated OS-default dropdown arrows.
- **NFR-3.3: Responsive Layout**: Responsive breakpoints ensuring usability on desktop monitors (1200px+), laptops (900px–1024px), and tablet/mobile viewports.

### 4.4 Quality Assurance & Testing
- **NFR-4.1: Automated Test Suite**: 100% passing pytest suite in `backend/tests/test_api.py` validating health checks, CRUD endpoints, duplicate rejection (409), negative salary validation (422), search queries, and currency-isolation guarantees.
- **NFR-4.2: Isolated Test Database**: Automated tests execute against in-memory SQLite with static thread pooling, ensuring zero mutation of local development data.

---

## 5. Scope & Boundary Conditions

### In-Scope (Implemented)
1. Full CRUD management of employee records with validation.
2. Filter toolbar (omnisearch, department filter, country filter, clear action).
3. Custom-styled enterprise dropdowns and checkbox inputs.
4. Multi-row selection with indeterminate select-all and floating bulk action bar.
5. Client-side CSV export of selected rows.
6. Currency-safe backend analytics grouped by country and currency.
7. Interactive Recharts visualizations for compensation bands and distributions.
8. Automated database seed script for 10,000 synthetic employee records.
9. Comprehensive pytest test suite with currency-isolation assertions.

### Out-of-Scope (Future Improvements)
1. **Live Foreign Exchange (FX) Conversion**: Real-time integration with ECB or OpenExchangeRates APIs (omitted intentionally to prevent reliance on volatile external network services or arbitrary conversion benchmarks).
2. **User Authentication & Role-Based Access Control (RBAC)**: Multi-user login (e.g., HR Admin vs. Read-Only Auditor) and OAuth2/JWT session management.
3. **Complex Payroll Withholding**: Local tax deductions, pension contributions, and medical insurance withholdings.
4. **Historical Audit Logs**: Event-sourcing ledger tracking every modification made to an employee record over time.
5. **Direct Banking Disbursement**: ACH / SEPA direct deposit integration.
