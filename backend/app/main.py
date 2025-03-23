from fastapi import FastAPI
from routes import map, schedule
from dotenv import load_dotenv
import os

load_dotenv()
app = FastAPI()

app.include_router(map.router, prefix="/map", tags=["Map"])
app.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])

@app.get("/")
def home():
    return {"message": "Welcome to FastAPI Backend!"}
