import urllib

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Define your PostgreSQL database connection
DB_PASS = urllib.parse.quote("@An27082005")
DATABASE_URL = f"postgresql://postgres:{DB_PASS}@localhost/quacktrack"
# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

def get_db():
    """ Dependency for database session """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
