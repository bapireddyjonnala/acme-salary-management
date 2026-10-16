# ACME Salary Management System

A full-stack salary management application designed to help HR managers manage employee records, review compensation, and analyze salary information across multiple countries and currencies.

## Features

- Employee directory with search and filtering.
- Employee compensation management.
- Create, view, edit, and delete employee records.
- Salary analytics with country-level comparisons.
- Local currency support for multiple countries.
- Dashboard with employee and compensation insights.
- Synthetic employee seed data for testing and scale evaluation.

## Technology Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic

## Supported Countries and Currencies

The seed data covers India (INR), United States (USD), United Kingdom (GBP), Germany (EUR), and Singapore (SGD).

The application displays salary analytics in the relevant local currency rather than combining different currencies into one misleading average.

## Run Locally

### 1. Start the backend

From the project root, open PowerShell and run:

```powershell
.\.venv\Scripts\Activate.ps1
```

Start the backend using the command configured in your project. For example, if the FastAPI application is exposed as `app` in `backend/main.py`:

```powershell
uvicorn backend.main:app --reload
```

API documentation: http://127.0.0.1:8000/docs

### 2. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## Testing

Run the backend tests from the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```

Build the frontend for production:

```powershell
cd frontend
npm run build
```

## Seed Data

The project includes a seed script for generating synthetic employee records for testing. Run it using the instructions and database configuration in the source code.

## Project Artifacts

Requirements, architecture/design notes, testing details, and AI-assisted development notes should be included in the repository as separate documentation files.

## Data and Security

The SQLite database is generated locally and should not be committed to the repository. Use synthetic data for development and testing. Do not store real employee or salary information in a public repository.

## Deployment

Deployment URLs will be added after the frontend and backend have been deployed.
