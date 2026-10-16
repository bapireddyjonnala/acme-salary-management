
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.main import app

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(
    bind=test_engine,
    autoflush=False,
    autocommit=False,
)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)


def sample_employee(code="TEST001"):
    return {
        "employee_code": code,
        "full_name": "Test Employee",
        "department": "Engineering",
        "country": "India",
        "currency": "INR",
        "salary": 50000,
        "hire_date": "2025-01-15",
    }


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_and_get_employee():
    created = client.post(
        "/api/employees",
        json=sample_employee(),
    )
    assert created.status_code == 201
    assert created.json()["employee_code"] == "TEST001"

    employee_id = created.json()["id"]
    fetched = client.get(f"/api/employees/{employee_id}")

    assert fetched.status_code == 200
    assert fetched.json()["full_name"] == "Test Employee"


def test_duplicate_employee_code_is_rejected():
    client.post("/api/employees", json=sample_employee())

    response = client.post(
        "/api/employees",
        json=sample_employee(),
    )

    assert response.status_code == 409


def test_invalid_salary_is_rejected():
    response = client.post(
        "/api/employees",
        json={**sample_employee(), "salary": -100},
    )
    assert response.status_code == 422


def test_search_employees():
    client.post("/api/employees", json=sample_employee())

    response = client.get(
        "/api/employees",
        params={"search": "TEST001"},
    )

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_salary_analytics():
    client.post("/api/employees", json=sample_employee())

    response = client.get("/api/analytics")

    assert response.status_code == 200
    assert response.json()["total_employees"] == 1


def test_salary_analytics_calculates_local_averages_per_currency_group():
    # Insert multiple employees across distinct currency groups
    client.post("/api/employees", json={
        "employee_code": "IN001",
        "full_name": "Indian Dev 1",
        "department": "Engineering",
        "country": "India",
        "currency": "INR",
        "salary": 40000,
        "hire_date": "2025-01-01"
    })
    client.post("/api/employees", json={
        "employee_code": "IN002",
        "full_name": "Indian Dev 2",
        "department": "Finance",
        "country": "India",
        "currency": "INR",
        "salary": 60000,
        "hire_date": "2025-01-01"
    })
    client.post("/api/employees", json={
        "employee_code": "US001",
        "full_name": "US Dev 1",
        "department": "Engineering",
        "country": "United States",
        "currency": "USD",
        "salary": 80000,
        "hire_date": "2025-01-01"
    })
    client.post("/api/employees", json={
        "employee_code": "US002",
        "full_name": "US Dev 2",
        "department": "Sales",
        "country": "United States",
        "currency": "USD",
        "salary": 120000,
        "hire_date": "2025-01-01"
    })

    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert data["total_employees"] == 4

    groups = {g["country"]: g for g in data["salary_by_country"]}
    assert "India" in groups
    assert "United States" in groups

    # Local average for India must be 50,000 INR
    india = groups["India"]
    assert india["currency"] == "INR"
    assert india["employee_count"] == 2
    assert india["average_salary"] == 50000.0
    assert india["minimum_salary"] == 40000.0
    assert india["maximum_salary"] == 60000.0

    # Local average for US must be 100,000 USD
    us = groups["United States"]
    assert us["currency"] == "USD"
    assert us["employee_count"] == 2
    assert us["average_salary"] == 100000.0
    assert us["minimum_salary"] == 80000.0
    assert us["maximum_salary"] == 120000.0


def test_unconverted_salaries_are_isolated_and_not_blended_into_global_average():
    """
    Verify that analytics keeps currency groups isolated and does not return
    a single blended average across different currencies.
    """
    client.post("/api/employees", json={
        "employee_code": "IN001",
        "full_name": "Indian Staff",
        "department": "Engineering",
        "country": "India",
        "currency": "INR",
        "salary": 150000,
        "hire_date": "2025-01-01"
    })
    client.post("/api/employees", json={
        "employee_code": "US001",
        "full_name": "US Staff",
        "department": "Engineering",
        "country": "United States",
        "currency": "USD",
        "salary": 30000,
        "hire_date": "2025-01-01"
    })

    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()

    # The API must not produce a global average field blending 150,000 INR and 30,000 USD
    assert "global_average" not in data
    assert "average_salary" not in data

    # Every country record must include its distinct currency code
    for group in data["salary_by_country"]:
        assert "currency" in group
        assert len(group["currency"]) == 3


def test_cannot_incorrectly_rank_unconverted_salaries():
    """
    Verify that raw numeric ranking would be invalid (150,000 INR vs 30,000 USD)
    and that groups are partitioned by their currency codes.
    """
    client.post("/api/employees", json={
        "employee_code": "IN001",
        "full_name": "High Nominal Low Value",
        "department": "Engineering",
        "country": "India",
        "currency": "INR",
        "salary": 150000,
        "hire_date": "2025-01-01"
    })
    client.post("/api/employees", json={
        "employee_code": "US001",
        "full_name": "Low Nominal High Value",
        "department": "Engineering",
        "country": "United States",
        "currency": "USD",
        "salary": 30000,
        "hire_date": "2025-01-01"
    })

    response = client.get("/api/analytics")
    data = response.json()
    groups = {g["country"]: g for g in data["salary_by_country"]}

    # Nominal numeric average of India is higher (150k > 30k),
    # but currencies differ (INR != USD), so ranking them directly is invalid.
    assert groups["India"]["average_salary"] > groups["United States"]["average_salary"]
    assert groups["India"]["currency"] != groups["United States"]["currency"]
    assert groups["India"]["currency"] == "INR"
    assert groups["United States"]["currency"] == "USD"
