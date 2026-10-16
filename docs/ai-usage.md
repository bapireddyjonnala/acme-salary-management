# AI-Assisted Development Log & Methodology

## 1. Overview & Context

This document provides a transparent, factual record of how AI assistance (Google Antigravity / Gemini) was leveraged in the development, architectural refinement, and testing of the **ACME Salary Management System**.

The engineering task centered on:
1. Identifying and correcting a severe financial calculation defect in cross-border salary analytics.
2. Expanding schema typing and automated test suites to enforce currency isolation.
3. Redesigning the user interface into an enterprise-grade SaaS dashboard with custom form controls and bulk operations.
4. Ensuring complete data integrity across 10,000 synthetic employee records in SQLite.

---

## 2. The Currency Analytics Issue & The Fix

### 2.1 Problem Description
The original baseline application attempted to display a single **"Global Average Salary"** across all 10,000 employees (~90,201).
- The dataset contains employees across five distinct countries: India (`INR`), United States (`USD`), United Kingdom (`GBP`), Germany (`EUR`), and Singapore (`SGD`).
- Directly averaging nominal amounts (e.g., ₹50,000 INR and $50,000 USD) is a catastrophic domain error: 50,000 INR is roughly ~$600 USD, whereas 50,000 USD is vastly higher in purchasing power and value.
- Without an authenticated, reliable foreign exchange (FX) conversion feed, presenting a single blended average or ranking employees internationally by raw salary amount produces mathematically meaningless and misleading metrics.

### 2.2 Technical Solution
The defect was resolved across both backend and frontend layers:

1. **Backend Schemas (`backend/schemas.py`)**:
   Introduced strongly typed Pydantic models partitioning analytics by sovereign country and currency:
   ```python
   class CountrySalaryAnalytics(BaseModel):
       country: str
       currency: str
       employee_count: int
       average_salary: float
       minimum_salary: float
       maximum_salary: float

   class AnalyticsResponse(BaseModel):
       total_employees: int
       salary_by_country: list[CountrySalaryAnalytics]
   ```

2. **Backend Query Refactoring (`backend/main.py`)**:
   Refactored `/api/analytics` to execute an explicit SQL aggregation grouped strictly by `(Employee.country, Employee.currency)`:
   ```python
   groups = (
       db.query(
           Employee.country,
           Employee.currency,
           func.count(Employee.id).label("employee_count"),
           func.avg(Employee.salary).label("average_salary"),
           func.min(Employee.salary).label("minimum_salary"),
           func.max(Employee.salary).label("maximum_salary"),
       )
       .group_by(Employee.country, Employee.currency)
       .order_by(Employee.country)
       .all()
   )
   ```
   All naive global average salary fields were permanently removed from the API response payload.

3. **Frontend Presentation (`frontend/src/App.jsx` & `frontend/src/App.css`)**:
   - Replaced the misleading global average stat card with a **"Local Average Salary"** card featuring an inline currency selector (`stat-select`), allowing the HR manager to inspect sovereign averages in their native currencies.
   - Built a dedicated **"Compensation & Payroll"** tab rendering individual regional breakdown cards showing headcount, local average, base minimum, and top maximum with visual distribution range bars.
   - Configured Recharts bar charts with explicit currency tooltips and explanatory disclaimers noting that amounts reflect sovereign currency without cross-border conversion.

4. **Automated Test Verification (`backend/tests/test_api.py`)**:
   Authored three dedicated test cases in pytest:
   - `test_salary_analytics_calculates_local_averages_per_currency_group`: Validates that Indian and US salaries are averaged strictly within their currency partitions.
   - `test_unconverted_salaries_are_isolated_and_not_blended_into_global_average`: Asserts that `global_average` and raw `average_salary` are never exposed at the root of the analytics payload.
   - `test_cannot_incorrectly_rank_unconverted_salaries`: Proves that nominal numeric values (e.g., 150k INR vs 30k USD) are marked with distinct currencies to prevent invalid sorting.

---

## 3. Representative Prompts & Development Iterations

The following prompts illustrate key milestones during development. *(Note: Where automated conversation compacting summarized earlier turns, representative prompts are labeled accordingly to match the prompt intent accurately).*

### Milestone 1: Currency-Safe Analytics Fix
> **Representative Prompt**:
> *"The application manages 10,000 employees across five countries using INR, USD, EUR, GBP, and SGD. Never calculate a global average by directly averaging salary amounts expressed in different currencies. Inspect the backend analytics API and frontend components to identify where the current 90,201 average is calculated and displayed. Replace the global average with a clearly labelled currency-specific metric or a country-wise salary summary. Do not invent exchange rates or imply that local-currency amounts are directly comparable."*
>
> **AI Contribution**:
> Analyzed the codebase, identified the root calculation in `backend/main.py`, restructured the SQL aggregation into partitioned country/currency groupings, updated Pydantic response models, and wrote 3 new unit tests ensuring currency isolation.

### Milestone 2: Enterprise UI & Visual Hierarchy Redesign
> **Representative Prompt**:
> *"Redesign the existing ACME Salary Management System into a polished, premium enterprise HR and payroll analytics dashboard. Use a modern visual hierarchy with an indigo/blue accent palette, dark sidebar, clean card proportions, and Recharts data visualizations without breaking existing functionality, database data, or currency safety."*
>
> **AI Contribution**:
> Engineered a comprehensive CSS design system (`frontend/src/App.css`), integrated Lucide icons and Recharts graphs, designed a fixed SaaS sidebar with route navigation tabs (Dashboard, Employees, Compensation, Analytics), and added interactive regional breakdown cards with range bars.

### Milestone 3: Custom Select Styling & Table Row Selection with Bulk Actions
> **Representative Prompt**:
> *"Upgrade all dropdown `<select>` menus with modern enterprise styling AND add table row selection checkboxes with bulk actions (CSV export, delete selected, deselect all)."*
>
> **AI Contribution**:
> Implemented custom SVG-based `<select>` menus (`appearance: none` with inline vector chevrons, hover effects, and indigo focus rings). Added row checkbox selection in `App.jsx` with `Set`-based ID tracking, table header indeterminate checkbox handling via `useRef`, a floating dark bulk action bar, client-side CSV generation, and batch deletion.

---

## 4. Technical Trade-Offs & Decisions

| Decision | Selected Approach | Alternative Considered | Rationale |
|---|---|---|---|
| **Currency Handling** | Strict partition by sovereign currency (`group_by(country, currency)`) | Integrate live third-party FX rate API (e.g., OpenExchangeRates) | Live FX APIs introduce network latency, rate limits, API key management, and fluctuating historical conversions. For an HR evaluation assessment, local currency isolation guarantees 100% mathematical truth without third-party dependencies. |
| **Bulk CSV Export** | Client-side Data URI Blob generation in JavaScript | Server-side `/api/employees/export` endpoint | Client-side export operates instantly on the already-selected employee objects in memory, requiring zero additional backend endpoints, zero file I/O on the server, and immediate user download. |
| **Directory Pagination** | Server-side limit/offset querying with client page slicing | Full client-side loading of all 10,000 records | Loading 10,000 JSON records into browser memory consumes substantial RAM and causes initial render lag. Limit/offset pagination keeps payloads small and UI snappy. |
| **Styling Solution** | Pure Vanilla CSS with `:root` tokens | TailwindCSS or Component Library (e.g., MUI / Chakra) | Vanilla CSS provided total pixel-level control over micro-animations, glassmorphism, custom `<select>` SVGs, and responsive breakpoints without bloated vendor node_modules or configuration locks. |

---

## 5. Verification & Validation Steps

The application was validated across every layer using automated and manual verification techniques:

1. **Backend Automated Testing**:
   - Executed `pytest backend/tests -v` inside the virtual environment.
   - Result: **9 of 9 tests passed in 1.30s**, confirming health, CRUD operations, duplicate handling, schema validation, and currency isolation.
2. **Frontend Production Build**:
   - Executed `npm run build` using Vite.
   - Result: **Successfully built in 774ms**, transforming 2,495 modules with zero JSX, lint, or bundling errors.
3. **Browser Automation Testing**:
   - Verified live UI interactions using browser subagent tooling on `http://localhost:5173/`:
     - Confirmed custom SVG dropdown styling on Dashboard and Employee filter toolbar.
     - Confirmed multi-row selection, table row indigo highlighting (`#eef2ff`), and appearance of the floating bulk action bar.
     - Confirmed select-all and deselect workflows.

---

## 6. Limitations & Known Remaining Gaps

While the system is robust for its current scope, the following technical limitations are acknowledged:

1. **No Production Deployment**:
   - The application is currently configured and verified for **local development and testing only** (FastAPI at `http://127.0.0.1:8000`, Vite at `http://localhost:5173`). It is not deployed to cloud infrastructure.
2. **SQLite Concurrency**:
   - SQLite is utilized for simple zero-configuration local execution. Under high concurrent write loads (e.g. dozens of simultaneous HR administrators), SQLite file locking would become a bottleneck. Production deployment requires migrating to PostgreSQL.
3. **Absence of Authentication**:
   - The API currently operates without authentication (JWT / OAuth2) or role-based authorization (RBAC).
4. **Static Search Limit**:
   - The Employee Directory UI queries up to 100 matching records per search/filter request (`limit=100`). Browsing beyond 100 search results would benefit from infinite scrolling or server-side total count pagination metadata.
