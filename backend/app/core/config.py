from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "LaunchCast AI"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "New-Product Demand Forecasting and Inventory Optimization Engine"
    API_V1_STR: str = "/api/v1"
    LIVE_DATA_PROVIDER_URL: str = "https://dummyjson.com/products?limit=100"
    LIVE_DATA_PROVIDER_NAME: str = "DummyJSON Products Public API"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
