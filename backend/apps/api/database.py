"""
WeighReport Database Layer
Connects to PostgreSQL (with 'oiml' schema/cluster) and handles resilient fallback if remote host is offline.
"""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from .config import settings

logger = logging.getLogger("weighreport.database")
Base = declarative_base()

def get_engine():
    # Attempt connecting to configured PostgreSQL
    db_url = settings.DATABASE_URL
    is_postgres = db_url.startswith("postgresql")
    
    if is_postgres:
        try:
            logger.info("Attempting connection to PostgreSQL: %s", settings.DB_HOST)
            # Short timeout to test connectivity
            test_engine = create_engine(
                db_url,
                connect_args={"connect_timeout": 3},
                pool_pre_ping=True
            )
            with test_engine.connect() as conn:
                # Create schema 'oiml' as requested
                logger.info("Connected to PostgreSQL! Ensuring schema 'oiml' exists...")
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS oiml;"))
                conn.commit()
            logger.info("Successfully configured PostgreSQL with 'oiml' schema!")
            return test_engine
        except Exception as e:
            logger.warning(
                "Could not connect to remote PostgreSQL host (%s): %s.\n"
                "Activating local SQLite fallback database (%s) to guarantee zero downtime.",
                settings.DB_HOST, e, settings.FALLBACK_DB_URL
            )

    # Fallback to local SQLite database
    sqlite_url = settings.FALLBACK_DB_URL
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
