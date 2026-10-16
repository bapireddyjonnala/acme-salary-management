
from sqlalchemy import Column, Integer, String, Numeric, Date
from .database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(20), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False, index=True)
    department = Column(String(80), nullable=False, index=True)
    country = Column(String(80), nullable=False, index=True)
    currency = Column(String(3), nullable=False)
    salary = Column(Numeric(12, 2), nullable=False)
    hire_date = Column(Date, nullable=False)
