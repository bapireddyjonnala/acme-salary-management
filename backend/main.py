from contextlib import asynccontextmanager
import os
import sys
from pathlib import Path

# Ensure project root and backend directory are in sys.path so 'backend.*' imports work from any working directory
_current_dir = Path(__file__).resolve().parent
_project_root = _current_dir.parent
for _p in [str(_project_root), str(_current_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

try:
    from backend.database import Base, engine, get_db, SessionLocal
    from backend.models import Employee
    from backend.schemas import AnalyticsResponse, EmployeeCreate, EmployeeResponse
except ModuleNotFoundError:
    from database import Base, engine, get_db, SessionLocal
    from models import Employee
    from schemas import AnalyticsResponse, EmployeeCreate, EmployeeResponse

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if "pytest" not in sys.modules:
        db = SessionLocal()
        try:
            if not db.query(Employee.id).first():
                try:
                    from seed import seed_employees
                    seed_employees()
                except Exception as seed_err:
                    print(f"Auto-seed notice: {seed_err}")
        finally:
            db.close()
    yield


app = FastAPI(title="ACME Salary Management System", lifespan=lifespan)

# Configure CORS origins to support local development and Vercel production deployment
cors_origins = [
    "https://acme-salary-management-one.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

env_origins = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("CORS_ORIGINS")
if env_origins:
    if env_origins.strip() == "*":
        cors_origins = ["*"]
    else:
        for origin in env_origins.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in cors_origins:
                cors_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if "*" not in cors_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "ACME Salary Management API is running!"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/employees", response_model=EmployeeResponse, status_code=201)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
):
    record = Employee(**employee.model_dump())
    db.add(record)
    try:
        db.commit()
        db.refresh(record)
        return record
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Employee code already exists.",
        )


@app.get("/api/employees", response_model=list[EmployeeResponse])
def list_employees(
    search: str | None = None,
    country: str | None = None,
    department: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Employee)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(term),
                Employee.employee_code.ilike(term),
            )
        )

    if country:
        query = query.filter(Employee.country == country)

    if department:
        query = query.filter(Employee.department == department)

    return (
        query.order_by(Employee.id)
        .offset(offset)
        .limit(limit)
        .all()
    )


@app.get("/api/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return employee


@app.put("/api/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeCreate,
    db: Session = Depends(get_db),
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found.")

    for field, value in data.model_dump().items():
        setattr(employee, field, value)

    try:
        db.commit()
        db.refresh(employee)
        return employee
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Employee code already exists.",
        )


@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found.")

    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted successfully."}


@app.get("/api/analytics", response_model=AnalyticsResponse)
def salary_analytics(db: Session = Depends(get_db)):
    total = db.query(func.count(Employee.id)).scalar() or 0

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

    return {
        "total_employees": total,
        "salary_by_country": [
            {
                "country": row.country,
                "currency": row.currency,
                "employee_count": row.employee_count,
                "average_salary": round(float(row.average_salary), 2),
                "minimum_salary": float(row.minimum_salary),
                "maximum_salary": float(row.maximum_salary),
            }
            for row in groups
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
