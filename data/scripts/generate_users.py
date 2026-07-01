"""Generate synthetic user profiles with rule-based risk tagging and existing holdings."""
import json
import random

import numpy as np
from faker import Faker

from config import SEED, NUM_USERS, CITIES, OCCUPATIONS, GOALS, LIFE_EVENT_USERS

INSTRUMENT_IDS = [
    "EQ_SIP_01", "EQ_SIP_02", "DEBT_01", "DEBT_02", "ETF_01", "ETF_02", "BAL_01",
]


def compute_risk_score(age, monthly_income, dependents, investment_experience_years):
    """Rule-based risk score in [0, 100]; higher = more risk tolerant."""
    score = 50
    score += max(0, (45 - age)) * 1.2          # younger -> more risk tolerance
    score += min(monthly_income / 5000, 20)     # higher income -> more headroom
    score -= dependents * 6                     # more dependents -> more conservative
    score += min(investment_experience_years * 2, 20)
    return max(5, min(95, round(score)))


def risk_bucket(score):
    if score < 40:
        return "Conservative"
    if score < 65:
        return "Moderate"
    return "Aggressive"


def allocate_existing_holdings(rng, risk_bucket_label, monthly_income):
    """Assign a small existing portfolio consistent with the user's risk bucket."""
    weights_by_bucket = {
        "Conservative": {"EQ_SIP_01": 0.1, "EQ_SIP_02": 0.0, "DEBT_01": 0.45,
                         "DEBT_02": 0.25, "ETF_01": 0.05, "ETF_02": 0.1, "BAL_01": 0.05},
        "Moderate": {"EQ_SIP_01": 0.25, "EQ_SIP_02": 0.1, "DEBT_01": 0.2,
                     "DEBT_02": 0.15, "ETF_01": 0.15, "ETF_02": 0.05, "BAL_01": 0.1},
        "Aggressive": {"EQ_SIP_01": 0.3, "EQ_SIP_02": 0.3, "DEBT_01": 0.05,
                       "DEBT_02": 0.05, "ETF_01": 0.2, "ETF_02": 0.0, "BAL_01": 0.1},
    }
    weights = weights_by_bucket[risk_bucket_label]
    base_portfolio_value = monthly_income * rng.uniform(2, 8)
    holdings = {}
    for inst_id, w in weights.items():
        if w > 0 and rng.random() < 0.85:
            holdings[inst_id] = round(base_portfolio_value * w * rng.uniform(0.7, 1.3), 2)
    return holdings


def main():
    Faker.seed(SEED)
    random.seed(SEED)
    rng = np.random.default_rng(SEED)
    fake = Faker("en_IN")

    users = []
    for i in range(NUM_USERS):
        age = int(rng.integers(23, 60))
        gender = random.choice(["Male", "Female"])
        name = fake.name()  # en_IN's gendered name_male/name_female data is unreliable; use generic
        city = random.choice(CITIES)
        occupation = random.choice(OCCUPATIONS)

        base_income = rng.normal(85000, 35000)
        monthly_income = max(20000, round(base_income, -2))

        marital_status = random.choice(["Single", "Married"])
        dependents = 0 if marital_status == "Single" else int(rng.integers(0, 4))
        investment_experience_years = int(rng.integers(0, 15))

        score = compute_risk_score(age, monthly_income, dependents, investment_experience_years)
        bucket = risk_bucket(score)

        num_goals = int(rng.integers(1, 4))
        goals = random.sample(GOALS, num_goals)

        monthly_expenses_estimate = round(monthly_income * rng.uniform(0.45, 0.8), -2)
        current_savings = round(monthly_income * rng.uniform(1, 15), -2)
        tenure_with_bank_years = int(rng.integers(1, 12))

        holdings = allocate_existing_holdings(rng, bucket, monthly_income)

        user = {
            "user_id": f"USR{i+1:03d}",
            "name": name,
            "age": age,
            "gender": gender,
            "city": city,
            "occupation": occupation,
            "marital_status": marital_status,
            "dependents": dependents,
            "monthly_income": monthly_income,
            "monthly_expenses_estimate": monthly_expenses_estimate,
            "current_savings": current_savings,
            "investment_experience_years": investment_experience_years,
            "risk_score": score,
            "risk_bucket": bucket,
            "financial_goals": goals,
            "tenure_with_bank_years": tenure_with_bank_years,
            "existing_holdings": holdings,
            "life_event_trigger": LIFE_EVENT_USERS.get(i),
        }
        users.append(user)

    with open("../output/users.json", "w") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(users)} user profiles.")


if __name__ == "__main__":
    main()
