from fastapi import FastAPI

from backend.app.database import Base, engine
from routes import map, schedule
from dotenv import load_dotenv
import os

load_dotenv()
app = FastAPI()

app.include_router(map.router, prefix="/map", tags=["Map"])
app.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])

app.include_router(auth.router)
@app.get("/")
def home():
    return {"message": "Welcome to FastAPI Backend!"}

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)