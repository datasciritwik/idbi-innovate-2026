from fastapi import APIRouter, HTTPException

from ..data_store import DataNotFoundError, get_store
from ..services.features import compute_features

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
def list_users():
    store = get_store()
    return [
        {
            "user_id": u["user_id"],
            "name": u["name"],
            "city": u["city"],
            "risk_bucket": u["risk_bucket"],
            "life_event_trigger": u["life_event_trigger"],
        }
        for u in store.list_users()
    ]


@router.get("/{user_id}")
def get_user_profile(user_id: str):
    store = get_store()
    try:
        user = store.get_user(user_id)
    except DataNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {**user, "features": compute_features(user_id)}
