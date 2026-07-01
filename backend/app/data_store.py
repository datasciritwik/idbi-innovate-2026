"""Loads the synthetic dataset once and serves it from memory.

Reads from config.DATA_DIR — locally the sibling data/output/ produced by
data/scripts/generate_all.py; at deploy time DATA_DIR should point at wherever
that dataset gets baked into the image (it is not committed to git).
"""
import json
from functools import lru_cache

import pandas as pd

from . import config


class DataNotFoundError(Exception):
    pass


class DataStore:
    def __init__(self, data_dir):
        self.data_dir = data_dir

        users_path = data_dir / "users.json"
        instruments_path = data_dir / "instruments.json"
        nav_path = data_dir / "instrument_nav_history.csv"
        txns_path = data_dir / "transactions.csv"

        for p in (users_path, instruments_path, nav_path, txns_path):
            if not p.exists():
                raise DataNotFoundError(
                    f"Missing dataset file: {p}. Run data/scripts/generate_all.py first, "
                    f"or point DATA_DIR at the baked-in dataset location."
                )

        with open(users_path) as f:
            users = json.load(f)
        with open(instruments_path) as f:
            instruments = json.load(f)

        self.users_by_id = {u["user_id"]: u for u in users}
        self.instruments_by_id = {i["instrument_id"]: i for i in instruments}

        self.nav_df = pd.read_csv(nav_path)
        self.nav_df["month"] = pd.PeriodIndex(self.nav_df["month"], freq="M")

        self.txns_df = pd.read_csv(txns_path, parse_dates=["date"])

    def list_users(self):
        return list(self.users_by_id.values())

    def get_user(self, user_id):
        user = self.users_by_id.get(user_id)
        if user is None:
            raise DataNotFoundError(f"Unknown user_id: {user_id}")
        return user

    def get_instrument(self, instrument_id):
        return self.instruments_by_id.get(instrument_id)

    def get_transactions(self, user_id):
        return self.txns_df[self.txns_df.user_id == user_id].sort_values("date")

    def latest_two_navs(self, instrument_id):
        rows = self.nav_df[self.nav_df.instrument_id == instrument_id].sort_values("month")
        if len(rows) < 2:
            return None, None
        return rows.iloc[-2]["nav"], rows.iloc[-1]["nav"]


@lru_cache(maxsize=1)
def get_store() -> DataStore:
    return DataStore(config.DATA_DIR)
