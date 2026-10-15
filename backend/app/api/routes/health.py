from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.config import settings
from app.schemas.common import HealthResponse, HealthServiceStatus

router = APIRouter(tags=["System"])

@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
        services=HealthServiceStatus()
    )
