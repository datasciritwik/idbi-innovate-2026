from fastapi import APIRouter, Depends, HTTPException

from ..data_store import DataNotFoundError
from ..security.deps import require_session
from ..services.portfolio import get_portfolio_snapshot

router = APIRouter(prefix="/api/users", tags=["portfolio"], dependencies=[Depends(require_session)])


@router.get("/{user_id}/portfolio")
def portfolio_snapshot(user_id: str):
    try:
        return get_portfolio_snapshot(user_id)
    except DataNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
