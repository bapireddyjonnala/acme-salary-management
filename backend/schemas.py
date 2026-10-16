
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class EmployeeCreate(BaseModel):
    employee_code: str = Field(min_length=1, max_length=20)
    full_name: str = Field(min_length=1, max_length=100)
    department: str = Field(min_length=1, max_length=80)
    country: str = Field(min_length=1, max_length=80)
    currency: str = Field(min_length=3, max_length=3)
    salary: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    hire_date: date


class EmployeeResponse(EmployeeCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


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

