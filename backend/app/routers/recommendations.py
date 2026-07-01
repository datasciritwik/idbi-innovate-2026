from fastapi import APIRouter, Depends, HTTPException

from ..data_store import DataNotFoundError
from ..security.deps import require_session
from ..services.allocation import generate_savings_plan

router = APIRouter(prefix="/api/users", tags=["recommendations"], dependencies=[Depends(require_session)])


@router.get("/{user_id}/recommendation")
def recommendation(user_id: str):
    try:
        return generate_savings_plan(user_id)
    except DataNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
