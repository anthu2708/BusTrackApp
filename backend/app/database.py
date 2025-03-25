import urllib

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Define your PostgreSQL database connection
load_dotenv()
DATABASE_URL =  os.getenv("DATABASE_URL")
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
