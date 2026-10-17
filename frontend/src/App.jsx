import { useEffect, useState, useMemo, useRef } from "react";
import {
  Users, Wallet, Search, Plus, RefreshCw,
  LayoutDashboard, Globe, X, ArrowRight,
  ChevronLeft, ChevronRight, Pencil, Trash2,
  Briefcase, BarChart3, Download
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from "recharts";
import "./App.css";

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  if (import.meta.env.PROD) {
    return "https://acme-salary-backend-s4j1.onrender.com/api";
  }
  return "/api";
}

const API = resolveApiBaseUrl();

const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Sales",
  "Marketing",
  "Operations"
];

const COUNTRIES = [
  { name: "India", currency: "INR", flag: "🇮🇳" },
  { name: "United States", currency: "USD", flag: "🇺🇸" },
  { name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { name: "Germany", currency: "EUR", flag: "🇩🇪" },
  { name: "Singapore", currency: "SGD", flag: "🇸🇬" }
];

function getDeptClass(dept) {
  switch (dept) {
    case "Engineering": return "dept-engineering";
    case "Human Resources": return "dept-human-resources";
    case "Finance": return "dept-finance";
    case "Sales": return "dept-sales";
    case "Marketing": return "dept-marketing";
    case "Operations": return "dept-operations";
    default: return "";
  }
}

function getInitials(name) {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [employees, setEmployees] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectAllRef = useRef(null);

  // Currency-Safe Selector state
  const [selectedDashboardCurrency, setSelectedDashboardCurrency] = useState("USD");
  const [selectedCompCountry, setSelectedCompCountry] = useState("United States");
  const [selectedAnalyticsCountry, setSelectedAnalyticsCountry] = useState("United States");

  const emptyForm = {
    employee_code: "",
    full_name: "",
    department: "Engineering",
    country: "India",
    currency: "INR",
    salary: "50000",
    hire_date: new Date().toISOString().slice(0, 10)
  };

  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (search.trim()) params.set("search", search.trim());
      if (countryFilter) params.set("country", countryFilter);
      if (departmentFilter) params.set("department", departmentFilter);

      const [employeeResponse, analyticsResponse] = await Promise.all([
        fetch(`${API}/employees?${params.toString()}`),
        fetch(`${API}/analytics`)
      ]);

      if (!employeeResponse.ok || !analyticsResponse.ok) {
        throw new Error("Could not load data. Check whether the backend is running.");
      }

      setEmployees(await employeeResponse.json());
      setAnalytics(await analyticsResponse.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    setPage(1);
  }, [search, countryFilter, departmentFilter]);

  const countryAnalytics = useMemo(() => {
    return analytics?.salary_by_country ?? [];
  }, [analytics]);

  const dashboardGroup = useMemo(() => {
    return countryAnalytics.find(g => g.currency === selectedDashboardCurrency)
      || countryAnalytics[0]
      || null;
  }, [countryAnalytics, selectedDashboardCurrency]);

  const compGroup = useMemo(() => {
    return countryAnalytics.find(g => g.country === selectedCompCountry)
      || countryAnalytics[0]
      || null;
  }, [countryAnalytics, selectedCompCountry]);

  const analyticsGroup = useMemo(() => {
    return countryAnalytics.find(g => g.country === selectedAnalyticsCountry)
      || countryAnalytics[0]
      || null;
  }, [countryAnalytics, selectedAnalyticsCountry]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(employees.length / pageSize));
  const paginatedEmployees = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return employees.slice(startIndex, startIndex + pageSize);
  }, [employees, page, pageSize]);

  // Selection calculations & handlers
  const pageEmployeeIds = useMemo(() => paginatedEmployees.map(e => e.id), [paginatedEmployees]);
  const isAllPageSelected = pageEmployeeIds.length > 0 && pageEmployeeIds.every(id => selectedIds.has(id));
  const isSomePageSelected = pageEmployeeIds.some(id => selectedIds.has(id)) && !isAllPageSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomePageSelected;
    }
  }, [isSomePageSelected]);

  function toggleSelectAll() {
    if (isAllPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageEmployeeIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageEmployeeIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  function selectAllLoadedEmployees() {
    setSelectedIds(new Set(employees.map(e => e.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelectEmployee(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function exportSelectedEmployees() {
    const selectedList = employees.filter(e => selectedIds.has(e.id));
    if (selectedList.length === 0) return;

    const headers = ["Employee ID", "Code", "Full Name", "Department", "Country", "Currency", "Salary", "Hire Date"];
    const rows = selectedList.map(e => [
      e.id,
      `"${(e.employee_code || "").replace(/"/g, '""')}"`,
      `"${(e.full_name || "").replace(/"/g, '""')}"`,
      `"${(e.department || "").replace(/"/g, '""')}"`,
      `"${(e.country || "").replace(/"/g, '""')}"`,
      `"${(e.currency || "").replace(/"/g, '""')}"`,
      e.salary,
      `"${e.hire_date || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `acme_employees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function deleteSelectedEmployees() {
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to delete ${count} selected employee${count > 1 ? "s" : ""}? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const idsToDelete = Array.from(selectedIds);
      await Promise.all(
        idsToDelete.map(id =>
          fetch(`${API}/employees/${id}`, { method: "DELETE" })
        )
      );
      clearSelection();
      await loadData();
    } catch (err) {
      setError("Failed to delete selected employees: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(employee) {
    setEditing(employee);
    setForm({
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      department: employee.department,
      country: employee.country,
      currency: employee.currency,
      salary: String(employee.salary),
      hire_date: employee.hire_date
    });
    setShowForm(true);
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(
        editing
          ? `${API}/employees/${editing.id}`
          : `${API}/employees`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, salary: Number(form.salary) })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Could not save employee.");
      }

      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEmployee(employee) {
    if (!window.confirm(`Delete record for ${employee.full_name} (${employee.employee_code})?`)) return;

    try {
      const response = await fetch(`${API}/employees/${employee.id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Could not delete employee.");
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(employee.id);
        return next;
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const hasActiveFilters = Boolean(search || departmentFilter || countryFilter);

  return (
    <div className="app-shell">
      {/* Redesigned Enterprise Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={20} strokeWidth={2.4} />
          </div>
          <div className="brand-title">
            <strong>ACME</strong>
            <small>PEOPLE & PAY</small>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <div className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === "employees" ? "active" : ""}`}
            onClick={() => setActiveTab("employees")}
          >
            <Users size={18} />
            <span>Employees</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === "compensation" ? "active" : ""}`}
            onClick={() => setActiveTab("compensation")}
          >
            <Wallet size={18} />
            <span>Compensation</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">
            HR
            <span className="avatar-status" />
          </div>
          <div className="profile-info">
            <strong>HR Manager</strong>
            <small>ACME Organization</small>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="eyebrow">
              WORKSPACE / {activeTab.toUpperCase()}
            </span>
            <h1>
              {activeTab === "dashboard" && "Salary Dashboard"}
              {activeTab === "employees" && "Employee Directory"}
              {activeTab === "compensation" && "Compensation & Payroll"}
              {activeTab === "analytics" && "Workforce & Salary Analytics"}
            </h1>
            <p>
              {activeTab === "dashboard" && "High-level overview of global headcount, payroll, and recent records."}
              {activeTab === "employees" && "Search, filter, update, and manage employee profiles and salaries."}
              {activeTab === "compensation" && "Regional salary ranges, minimum/maximum bands, and payroll budgets."}
              {activeTab === "analytics" && "Visual benchmarks, distributions, and international compensation trends."}
            </p>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={loadData} title="Refresh Data" aria-label="Refresh Data">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="primary-btn" onClick={openAddForm}>
              <Plus size={17} strokeWidth={2.4} />
              <span>Add employee</span>
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="icon-btn" onClick={() => setError("")} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        {/* ========================================================
            TAB 1: DASHBOARD
           ======================================================== */}
        {activeTab === "dashboard" && (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Users size={16} /></div>
                    <span className="stat-label">Total Employees</span>
                  </div>
                </div>
                <div className="stat-value">
                  {analytics?.total_employees ? analytics.total_employees.toLocaleString("en-US") : "—"}
                </div>
                <div className="stat-note">Across all regional branches</div>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Globe size={16} /></div>
                    <span className="stat-label">Operating Countries</span>
                  </div>
                </div>
                <div className="stat-value">
                  {countryAnalytics.length ? `${countryAnalytics.length} Countries` : "—"}
                </div>
                <div className="stat-note">5 distinct local currency groups</div>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Wallet size={16} /></div>
                    <span className="stat-label">Local Average Salary</span>
                  </div>
                  <select
                    aria-label="Select currency for local average"
                    className="stat-select"
                    value={dashboardGroup?.currency ?? selectedDashboardCurrency}
                    onChange={e => setSelectedDashboardCurrency(e.target.value)}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.currency} value={c.currency}>
                        {c.currency} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="stat-value">
                  {dashboardGroup
                    ? `${dashboardGroup.currency} ${dashboardGroup.average_salary.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "—"}
                </div>
                <div className="stat-note">
                  {dashboardGroup ? `${dashboardGroup.country} local average (No conversion applied)` : "Select a currency"}
                </div>
              </article>
            </section>

            {/* Compensation Overview Chart */}
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Compensation Overview</h2>
                  <p>Average salary grouped by country and local currency</p>
                </div>
              </div>

              <div className="chart-area">
                {countryAnalytics.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryAnalytics} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="country" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)"
                        }}
                        formatter={(value, name, item) => [
                          `${item.payload.currency} ${Number(value).toLocaleString()}`,
                          "Average Salary"
                        ]}
                      />
                      <Bar dataKey="average_salary" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    {loading ? "Loading salary data..." : "No salary data available yet."}
                  </div>
                )}
              </div>
              <p className="chart-note">
                <Globe size={13} /> Salary values are shown in each group's local currency (INR, USD, GBP, EUR, SGD). Amounts are not converted to a common base.
              </p>
            </section>

            {/* Recent Employees Preview */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent Employees</h2>
                  <p>Latest active personnel records</p>
                </div>
                <button className="secondary-btn" onClick={() => setActiveTab("employees")}>
                  <span>Open full directory</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Country</th>
                      <th>Salary</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.slice(0, 8).map(employee => {
                      const countryObj = COUNTRIES.find(c => c.name === employee.country);
                      return (
                        <tr key={employee.id}>
                          <td>
                            <div className="employee-cell">
                              <div className="employee-avatar-sm">{getInitials(employee.full_name)}</div>
                              <div>
                                <div className="employee-name">{employee.full_name}</div>
                                <div className="employee-code-badge">{employee.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${getDeptClass(employee.department)}`}>
                              {employee.department}
                            </span>
                          </td>
                          <td>
                            <div className="country-badge">
                              <span>{countryObj?.flag || "🌐"}</span>
                              <span>{employee.country}</span>
                              <span className="currency-tag">{employee.currency}</span>
                            </div>
                          </td>
                          <td className="salary-cell">
                            {employee.currency} {Number(employee.salary).toLocaleString()}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="action-btn" onClick={() => openEditForm(employee)} title="Edit">
                                <Pencil size={13} /> Edit
                              </button>
                              <button className="action-btn delete" onClick={() => deleteEmployee(employee)} title="Delete">
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {!loading && employees.length === 0 && (
                  <div className="empty-state">
                    No employees found. Click "Add employee" to create your first record.
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ========================================================
            TAB 2: EMPLOYEES DIRECTORY
           ======================================================== */}
        {activeTab === "employees" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Employee Directory</h2>
                <p>Search, filter, update, and manage global workforce personnel</p>
              </div>
              <span className="record-count">{employees.length} records found</span>
            </div>

            {/* Filter Toolbar */}
            <div className="filter-bar">
              <div className="search-box">
                <Search size={16} />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search by name or employee ID..."
                  aria-label="Search employees"
                />
                {search && (
                  <button className="search-clear-btn" onClick={() => setSearch("")} title="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                className="filter-select"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                className="filter-select"
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                aria-label="Filter by country"
              >
                <option value="">All Countries</option>
                {COUNTRIES.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name} ({c.currency})
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  className="clear-btn"
                  onClick={() => {
                    setSearch("");
                    setDepartmentFilter("");
                    setCountryFilter("");
                  }}
                >
                  <X size={13} />
                  <span>Clear filters</span>
                </button>
              )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="bulk-bar" role="region" aria-label="Bulk actions">
                <div className="bulk-bar-left">
                  <span className="bulk-count-badge">{selectedIds.size}</span>
                  <span>employee{selectedIds.size > 1 ? "s" : ""} selected</span>
                  {selectedIds.size < employees.length && (
                    <button
                      type="button"
                      className="bulk-btn bulk-btn-export"
                      style={{ marginLeft: "8px", fontSize: "11px", padding: "4px 8px" }}
                      onClick={selectAllLoadedEmployees}
                    >
                      Select all {employees.length}
                    </button>
                  )}
                </div>
                <div className="bulk-bar-actions">
                  <button
                    type="button"
                    className="bulk-btn bulk-btn-export"
                    onClick={exportSelectedEmployees}
                    title="Export selected rows as CSV"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    className="bulk-btn bulk-btn-delete"
                    onClick={deleteSelectedEmployees}
                    title="Delete selected employees"
                  >
                    <Trash2 size={14} />
                    <span>Delete Selected</span>
                  </button>
                  <button
                    type="button"
                    className="bulk-btn bulk-btn-clear"
                    onClick={clearSelection}
                    title="Clear row selections"
                  >
                    <X size={14} />
                    <span>Deselect</span>
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "42px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        className="table-checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all employees on current page"
                      />
                    </th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Country</th>
                    <th>Salary</th>
                    <th>Hire Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map(employee => {
                    const countryObj = COUNTRIES.find(c => c.name === employee.country);
                    const isSelected = selectedIds.has(employee.id);
                    return (
                      <tr key={employee.id} className={isSelected ? "selected" : ""}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            className="table-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectEmployee(employee.id)}
                            aria-label={`Select ${employee.full_name}`}
                          />
                        </td>
                        <td>
                          <div className="employee-cell">
                            <div className="employee-avatar-sm">{getInitials(employee.full_name)}</div>
                            <div>
                              <div className="employee-name">{employee.full_name}</div>
                              <div className="employee-code-badge">{employee.employee_code}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getDeptClass(employee.department)}`}>
                            {employee.department}
                          </span>
                        </td>
                        <td>
                          <div className="country-badge">
                            <span>{countryObj?.flag || "🌐"}</span>
                            <span>{employee.country}</span>
                            <span className="currency-tag">{employee.currency}</span>
                          </div>
                        </td>
                        <td className="salary-cell">
                          {employee.currency} {Number(employee.salary).toLocaleString()}
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {employee.hire_date || "—"}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="action-btn" onClick={() => openEditForm(employee)} title="Edit Employee">
                              <Pencil size={13} /> Edit
                            </button>
                            <button className="action-btn delete" onClick={() => deleteEmployee(employee)} title="Delete Employee">
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && employees.length === 0 && (
                <div className="empty-state">
                  <strong>No employees matched your criteria</strong>
                  <span>Try adjusting your search terms or clearing the active filters.</span>
                  {hasActiveFilters && (
                    <button
                      className="secondary-btn"
                      style={{ marginTop: "10px" }}
                      onClick={() => {
                        setSearch("");
                        setDepartmentFilter("");
                        setCountryFilter("");
                      }}
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {employees.length > 0 && (
              <div className="pagination-toolbar">
                <div className="pagination-info">
                  Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                  <strong>{Math.min(page * pageSize, employees.length)}</strong> of{" "}
                  <strong>{employees.length}</strong> employees
                </div>

                <div className="pagination-controls">
                  <select
                    className="stat-select"
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Rows per page"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>

                  <button
                    className="page-btn"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <span style={{ fontSize: "12px", fontWeight: 600, padding: "0 6px" }}>
                    Page {page} of {totalPages}
                  </span>

                  <button
                    className="page-btn"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    aria-label="Next Page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================
            TAB 3: COMPENSATION
           ======================================================== */}
        {activeTab === "compensation" && (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Users size={16} /></div>
                    <span className="stat-label">Total Headcount</span>
                  </div>
                </div>
                <div className="stat-value">
                  {analytics?.total_employees ? analytics.total_employees.toLocaleString("en-US") : "—"}
                </div>
                <div className="stat-note">Across all regional branches</div>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Globe size={16} /></div>
                    <span className="stat-label">Country Salary Overview</span>
                  </div>
                  <select
                    aria-label="Select country for salary overview"
                    className="stat-select"
                    value={compGroup?.country ?? selectedCompCountry}
                    onChange={e => setSelectedCompCountry(e.target.value)}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="stat-value">
                  {compGroup
                    ? `${compGroup.currency} ${compGroup.average_salary.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "—"}
                </div>
                <div className="stat-note">
                  {compGroup
                    ? `${compGroup.country} local avg · Range: ${compGroup.currency} ${compGroup.minimum_salary.toLocaleString()} - ${compGroup.maximum_salary.toLocaleString()}`
                    : "Market overview"}
                </div>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Wallet size={16} /></div>
                    <span className="stat-label">Currency Groups</span>
                  </div>
                </div>
                <div className="stat-value">
                  {countryAnalytics.length ? `${countryAnalytics.length} Currencies` : "—"}
                </div>
                <div className="stat-note">Supported: INR, USD, GBP, EUR, SGD</div>
              </article>
            </section>

            {/* Regional Compensation Cards Grid */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Regional Compensation Breakdown</h2>
                  <p>Minimum, average, and maximum salary brackets calculated per currency group</p>
                </div>
              </div>

              <div className="comp-card-grid">
                {countryAnalytics.map(group => {
                  const countryObj = COUNTRIES.find(c => c.name === group.country);
                  const range = group.maximum_salary - group.minimum_salary || 1;
                  const percent = Math.min(
                    100,
                    Math.max(0, ((group.average_salary - group.minimum_salary) / range) * 100)
                  );
                  const estimatedPayroll = Math.round(group.employee_count * group.average_salary);

                  return (
                    <div className="comp-card" key={group.country}>
                      <div className="comp-card-header">
                        <div className="comp-country-title">
                          <span>{countryObj?.flag || "🌐"}</span>
                          <span>{group.country}</span>
                        </div>
                        <span className="comp-currency-badge">{group.currency}</span>
                      </div>

                      <div className="comp-metrics-grid">
                        <div className="comp-metric-box">
                          <label>Employees</label>
                          <strong>{group.employee_count.toLocaleString()}</strong>
                        </div>
                        <div className="comp-metric-box">
                          <label>Average Salary</label>
                          <strong>{group.currency} {group.average_salary.toLocaleString()}</strong>
                        </div>
                        <div className="comp-metric-box">
                          <label>Minimum Base</label>
                          <strong>{group.currency} {group.minimum_salary.toLocaleString()}</strong>
                        </div>
                        <div className="comp-metric-box">
                          <label>Maximum Top</label>
                          <strong>{group.currency} {group.maximum_salary.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="range-bar-wrapper">
                        <div className="range-labels">
                          <span>Min: {group.currency} {group.minimum_salary.toLocaleString()}</span>
                          <span>Max: {group.currency} {group.maximum_salary.toLocaleString()}</span>
                        </div>
                        <div className="range-track">
                          <div className="range-fill" style={{ width: `${percent}%` }} />
                        </div>
                      </div>

                      <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                        <span>Est. Regional Payroll:</span>
                        <strong style={{ color: "var(--text-primary)" }}>{group.currency} {estimatedPayroll.toLocaleString()}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Comparative Range Chart */}
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Comparative Salary Range (Min vs Avg vs Max)</h2>
                  <p>Side-by-side visualization of salary brackets within each local market</p>
                </div>
              </div>

              <div className="chart-area" style={{ height: "300px" }}>
                {countryAnalytics.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryAnalytics} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="country" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)"
                        }}
                        formatter={(value, name, item) => [
                          `${item.payload.currency} ${Number(value).toLocaleString()}`,
                          name === "minimum_salary" ? "Min Salary" : name === "average_salary" ? "Avg Salary" : "Max Salary"
                        ]}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                      <Bar dataKey="minimum_salary" name="Min Salary" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="average_salary" name="Avg Salary" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="maximum_salary" name="Max Salary" fill="#312e81" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>

              <p className="chart-note">
                <Globe size={13} /> Local currency brackets shown per country. Bars represent market ranges within each local currency without cross-currency ranking.
              </p>
            </section>
          </>
        )}

        {/* ========================================================
            TAB 4: ANALYTICS
           ======================================================== */}
        {activeTab === "analytics" && (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Users size={16} /></div>
                    <span className="stat-label">Total Workforce</span>
                  </div>
                </div>
                <div className="stat-value">
                  {analytics?.total_employees ? analytics.total_employees.toLocaleString("en-US") : "—"}
                </div>
                <div className="stat-note">Global organizational headcount</div>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><Globe size={16} /></div>
                    <span className="stat-label">Global Branches</span>
                  </div>
                </div>
                <div className="stat-value">
                  {countryAnalytics.length ? `${countryAnalytics.length} Operating Markets` : "—"}
                </div>
                <div className="stat-note">Operating in 5 sovereign regions</div>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <div className="stat-title-wrap">
                    <div className="stat-icon-wrapper"><BarChart3 size={16} /></div>
                    <span className="stat-label">Market Average Benchmark</span>
                  </div>
                  <select
                    aria-label="Select market benchmark"
                    className="stat-select"
                    value={analyticsGroup?.country ?? selectedAnalyticsCountry}
                    onChange={e => setSelectedAnalyticsCountry(e.target.value)}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.flag} {c.name} ({c.currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="stat-value">
                  {analyticsGroup
                    ? `${analyticsGroup.currency} ${analyticsGroup.average_salary.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "—"}
                </div>
                <div className="stat-note">
                  {analyticsGroup ? `${analyticsGroup.country} local benchmark (Currency-isolated)` : "Isolated market benchmark"}
                </div>
              </article>
            </section>

            {/* Average Salary Benchmark Chart */}
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Average Salary Benchmark</h2>
                  <p>Regional compensation comparison in respective local currencies</p>
                </div>
              </div>

              <div className="chart-area" style={{ height: "260px" }}>
                {countryAnalytics.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryAnalytics} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="country" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)"
                        }}
                        formatter={(value, name, item) => [
                          `${item.payload.currency} ${Number(value).toLocaleString()}`,
                          "Average Salary"
                        ]}
                      />
                      <Bar dataKey="average_salary" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
              <p className="chart-note">
                <Globe size={13} /> Regional compensation averages shown in local currencies (INR, USD, GBP, EUR, SGD). No cross-currency exchange conversion is applied.
              </p>
            </section>

            {/* Headcount Distribution Chart */}
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Headcount Distribution by Region</h2>
                  <p>Active employee allocation deployed across international markets</p>
                </div>
              </div>

              <div className="chart-area" style={{ height: "260px" }}>
                {countryAnalytics.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryAnalytics} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="country" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)"
                        }}
                        formatter={(value) => [
                          `${Number(value).toLocaleString()} personnel`,
                          "Headcount"
                        ]}
                      />
                      <Bar dataKey="employee_count" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </section>

            {/* Workforce Department Distribution */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Departmental Structure</h2>
                  <p>Organizational distribution across key functional areas</p>
                </div>
              </div>

              <div className="comp-card-grid">
                {DEPARTMENTS.map(dept => {
                  return (
                    <div className="comp-card" key={dept} style={{ padding: "16px" }}>
                      <div className="comp-card-header" style={{ borderBottom: "none", paddingBottom: "0" }}>
                        <div className="comp-country-title" style={{ fontSize: "14px" }}>
                          <Briefcase size={16} color="var(--primary)" />
                          <span>{dept}</span>
                        </div>
                        <span className={`badge ${getDeptClass(dept)}`}>Active</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                        Core organizational department operating across all 5 international entities.
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <footer>ACME Salary Management System · Enterprise Human Capital & Payroll Platform</footer>
      </main>

      {/* Add / Edit Employee Modal Dialog */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="employee-form" onSubmit={saveEmployee} onClick={e => e.stopPropagation()}>
            <div className="panel-heading" style={{ marginBottom: "0" }}>
              <div>
                <h2>{editing ? "Edit Employee" : "Add New Employee"}</h2>
                <p>Provide the profile and compensation details below.</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowForm(false)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Employee ID *</label>
                <input
                  required
                  maxLength={20}
                  placeholder="e.g. ACME10001"
                  value={form.employee_code}
                  onChange={e => setForm({ ...form, employee_code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  required
                  maxLength={100}
                  placeholder="e.g. Priya Sharma"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Department *</label>
                <select
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                >
                  {DEPARTMENTS.map(x => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Country *</label>
                <select
                  value={form.country}
                  onChange={e => {
                    const found = COUNTRIES.find(c => c.name === e.target.value);
                    setForm({
                      ...form,
                      country: e.target.value,
                      currency: found ? found.currency : form.currency
                    });
                  }}
                >
                  {COUNTRIES.map(x => (
                    <option key={x.name} value={x.name}>
                      {x.flag} {x.name} ({x.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Salary & Currency *</label>
                <div className="salary-input-group">
                  <select
                    aria-label="Currency"
                    value={form.currency}
                    onChange={e => setForm({ ...form, currency: e.target.value })}
                  >
                    {["INR", "USD", "GBP", "EUR", "SGD"].map(x => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="50000"
                    value={form.salary}
                    onChange={e => setForm({ ...form, salary: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Hire Date *</label>
                <input
                  required
                  type="date"
                  value={form.hire_date}
                  onChange={e => setForm({ ...form, hire_date: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={submitting}
              >
                {submitting ? "Saving..." : editing ? "Save changes" : "Create employee"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
