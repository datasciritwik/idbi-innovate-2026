"""Generate 12 months of UPI/bank transaction logs per user.

Includes recurring salary, rent/EMI, SIP debits (matching existing_holdings),
everyday spend categories, and 3 scripted life-event journeys (salary bump,
medical expense, job loss) used to demo the personalization engine's adaptability.
"""
import json
import random

import numpy as np
import pandas as pd
from faker import Faker

from config import SEED, MONTHS_OF_HISTORY, SIM_END_MONTH

MERCHANTS = {
    "Groceries": ["BigBasket", "DMart", "Reliance Fresh", "Local Kirana Store"],
    "Utilities": ["Tata Power", "Airtel Broadband", "Jio Fiber", "Municipal Water Board"],
    "Dining": ["Swiggy", "Zomato", "Local Restaurant", "Cafe Coffee Day"],
    "Shopping": ["Amazon", "Flipkart", "Myntra", "Local Mall"],
    "Entertainment": ["Netflix", "BookMyShow", "Spotify", "PVR Cinemas"],
    "Fuel": ["Indian Oil", "HP Petrol Pump", "Shell"],
    "Insurance": ["LIC Premium", "HDFC Ergo", "Star Health Insurance"],
    "Transfer": ["Family Transfer", "Friend Split", "UPI Transfer"],
    "Medical": ["Apollo Pharmacy", "Max Hospital", "Local Clinic", "Diagnostic Lab"],
}

CATEGORY_INCOME_FRACTION = {
    "Rent": (0.18, 0.28),
    "EMI": (0.1, 0.2),
    "Groceries": (0.08, 0.14),
    "Utilities": (0.02, 0.04),
    "Dining": (0.03, 0.07),
    "Shopping": (0.03, 0.09),
    "Entertainment": (0.01, 0.03),
    "Fuel": (0.02, 0.04),
    "Insurance": (0.02, 0.05),
}

CHANNELS = ["UPI", "UPI", "UPI", "NEFT", "Card", "ATM"]


def sample_amount(rng, income, category):
    lo, hi = CATEGORY_INCOME_FRACTION[category]
    return round(income * rng.uniform(lo, hi), 2)


def generate_user_transactions(rng, fake, user, month_index):
    user_id = user["user_id"]
    income = user["monthly_income"]
    holdings = user["existing_holdings"]
    life_event = user["life_event_trigger"]
    trigger_month_idx = MONTHS_OF_HISTORY - 5  # life event kicks in with 5 months of runway to demo

    txns = []
    balance = user["current_savings"] * rng.uniform(0.3, 0.6)
    has_rent = rng.random() < 0.6
    has_emi = rng.random() < 0.4

    for m_idx, month in enumerate(month_index):
        month_start = month.to_timestamp()
        current_income = income
        skip_salary = False

        if life_event == "salary_bump" and m_idx >= trigger_month_idx:
            current_income = income * 1.22
        if life_event == "job_loss" and m_idx >= trigger_month_idx:
            skip_salary = True

        # Salary credit
        if not skip_salary:
            salary_date = month_start + pd.Timedelta(days=random.randint(0, 2))
            balance += current_income
            txns.append(_row(user_id, salary_date, "Salary", "Credit", current_income,
                              "NEFT", "Employer Salary Credit", balance))
        else:
            # reduced freelance/severance income during job loss
            if rng.random() < 0.5:
                partial = current_income * rng.uniform(0.15, 0.35)
                salary_date = month_start + pd.Timedelta(days=random.randint(0, 5))
                balance += partial
                txns.append(_row(user_id, salary_date, "Freelance Income", "Credit", partial,
                                  "UPI", "Freelance/Gig Payment", balance))

        # Recurring fixed expenses
        for category, enabled in (("Rent", has_rent), ("EMI", has_emi)):
            if enabled:
                amt = sample_amount(rng, current_income, category)
                date = month_start + pd.Timedelta(days=random.randint(1, 5))
                balance -= amt
                merchant = "Landlord" if category == "Rent" else "Loan EMI - HDFC Bank"
                txns.append(_row(user_id, date, category, "Debit", amt, "UPI" if category == "Rent" else "NEFT",
                                  merchant, balance))

        # SIP investment debits (matching existing holdings)
        for inst_id, value in holdings.items():
            monthly_sip = round(value / 24, 2)  # assume holding accumulated over ~24 months
            date = month_start + pd.Timedelta(days=random.randint(3, 7))
            balance -= monthly_sip
            txns.append(_row(user_id, date, "Investment_SIP", "Debit", monthly_sip, "UPI",
                              f"SIP - {inst_id}", balance))

        # Everyday spend categories
        for category in ["Groceries", "Utilities", "Dining", "Shopping", "Entertainment", "Fuel", "Insurance"]:
            n_events = 1 if category in ("Utilities", "Insurance") else random.randint(2, 5)
            for _ in range(n_events):
                amt = sample_amount(rng, current_income, category) / n_events
                day = random.randint(1, 28)
                date = month_start + pd.Timedelta(days=day)
                balance -= amt
                merchant = random.choice(MERCHANTS[category])
                txns.append(_row(user_id, date, category, "Debit", round(amt, 2),
                                  random.choice(CHANNELS), merchant, balance))

        # occasional transfers
        if rng.random() < 0.4:
            amt = round(current_income * rng.uniform(0.01, 0.05), 2)
            date = month_start + pd.Timedelta(days=random.randint(1, 28))
            balance -= amt
            txns.append(_row(user_id, date, "Transfer", "Debit", amt, "UPI",
                              random.choice(MERCHANTS["Transfer"]), balance))

        # scripted medical expense spike
        if life_event == "medical_expense" and m_idx == trigger_month_idx:
            amt = round(current_income * rng.uniform(2.5, 4.0), 2)
            date = month_start + pd.Timedelta(days=random.randint(10, 20))
            balance -= amt
            txns.append(_row(user_id, date, "Medical", "Debit", amt, "Card",
                              "Max Hospital - Emergency Treatment", balance))
        elif rng.random() < 0.15:
            amt = sample_amount(rng, current_income, "Utilities") * rng.uniform(1, 3)
            date = month_start + pd.Timedelta(days=random.randint(1, 28))
            balance -= amt
            txns.append(_row(user_id, date, "Medical", "Debit", round(amt, 2), "Card",
                              random.choice(MERCHANTS["Medical"]), balance))

    return txns


def _row(user_id, date, category, txn_type, amount, channel, merchant, balance):
    return {
        "user_id": user_id,
        "date": date.strftime("%Y-%m-%d"),
        "category": category,
        "type": txn_type,
        "amount": round(amount, 2),
        "channel": channel,
        "merchant": merchant,
        "balance_after": round(balance, 2),
    }


def main():
    rng = np.random.default_rng(SEED)
    random.seed(SEED)
    fake = Faker("en_IN")

    with open("../output/users.json") as f:
        users = json.load(f)

    month_index = pd.period_range(end=SIM_END_MONTH, periods=MONTHS_OF_HISTORY, freq="M")

    all_txns = []
    for user in users:
        all_txns.extend(generate_user_transactions(rng, fake, user, month_index))

    df = pd.DataFrame(all_txns)
    df.sort_values(["user_id", "date"], inplace=True)
    df.insert(0, "transaction_id", [f"TXN{i+1:06d}" for i in range(len(df))])
    df.to_csv("../output/transactions.csv", index=False)

    print(f"Generated {len(df)} transactions across {len(users)} users.")


if __name__ == "__main__":
    main()
