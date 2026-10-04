"""
WeighReport API Configuration
"""
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )
    POSTGRES_URL: str = os.getenv(
        "POSTGRES_URL",
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "postgres")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_SCHEMA: str = os.getenv("DB_SCHEMA", "oiml")
    FALLBACK_DB_URL: str = os.getenv("FALLBACK_DB_URL", "sqlite:///./oiml.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "oiml-r76-weighreport-secret-key-2026")
    ENGINE_VERSION: str = "1.0.0"
    DEFAULT_RULEPACK_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
