"""Shared constants for synthetic data generation."""

SEED = 42
NUM_USERS = 30
MONTHS_OF_HISTORY = 12
SIM_END_MONTH = "2026-06"  # last full month before "today" (2026-07-01)

CITIES = [
    "Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad",
    "Chennai", "Ahmedabad", "Kolkata", "Jaipur", "Lucknow",
]

OCCUPATIONS = [
    "Salaried - IT", "Salaried - Banking", "Salaried - Govt",
    "Salaried - Manufacturing", "Self-Employed - Business",
    "Self-Employed - Professional", "Salaried - Healthcare",
]

GOALS = [
    "Retirement Planning", "Home Purchase", "Child Education",
    "Wealth Growth", "Emergency Fund", "Vacation/Lifestyle", "Tax Saving",
]

RISK_BUCKETS = ["Conservative", "Moderate", "Aggressive"]

# Users (0-indexed demo_id) receiving a scripted life-event trigger.
LIFE_EVENT_USERS = {
    3: "salary_bump",
    9: "medical_expense",
    17: "job_loss",
}
