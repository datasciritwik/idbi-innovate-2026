from fastapi import APIRouter, Depends, HTTPException

from ..data_store import DataNotFoundError, get_store
from ..security.deps import require_session
from ..services.transactions import get_recent_transactions

router = APIRouter(prefix="/api/users", tags=["transactions"], dependencies=[Depends(require_session)])


@router.get("/{user_id}/transactions")
def recent_transactions(user_id: str, limit: int = 10):
    try:
        get_store().get_user(user_id)
    except DataNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return get_recent_transactions(user_id, limit)
