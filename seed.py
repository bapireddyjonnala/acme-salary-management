
import random
from datetime import date, timedelta
from decimal import Decimal

from backend.database import Base, SessionLocal, engine
from backend.models import Employee

DEPARTMENTS = [
    "Engineering", "Human Resources", "Finance",
    "Sales", "Marketing", "Operations",
]

COUNTRIES = [
    ("India", "INR"),
    ("United States", "USD"),
    ("United Kingdom", "GBP"),
    ("Germany", "EUR"),
    ("Singapore", "SGD"),
]

FIRST_NAMES = ["Arun", "Priya", "Rahul", "Sneha", "David",
               "Aisha", "Kiran", "Meera", "John", "Sara"]
LAST_NAMES = ["Sharma", "Reddy", "Kumar", "Patel", "Smith",
              "Jones", "Rao", "Singh", "Brown", "Wilson"]


def seed_employees():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(Employee.id).first()
        if existing:
            print("Employees already exist. Seed skipped.")
            return

        batch = []
        today = date.today()

        for i in range(1, 10001):
            country, currency = COUNTRIES[(i - 1) % len(COUNTRIES)]
            batch.append(Employee(
                employee_code=f"ACME{i:05d}",
                full_name=(
                    f"{FIRST_NAMES[(i - 1) % len(FIRST_NAMES)]} "
                    f"{LAST_NAMES[(i * 7) % len(LAST_NAMES)]}"
                ),
                department=DEPARTMENTS[(i - 1) % len(DEPARTMENTS)],
                country=country,
                currency=currency,
                salary=Decimal(str(random.randint(30000, 150000))),
                hire_date=today - timedelta(days=(i % 2500)),
            ))

        db.add_all(batch)
        db.commit()
        print("Successfully created 10,000 employees.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_employees()
