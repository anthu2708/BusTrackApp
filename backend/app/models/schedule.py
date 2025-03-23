from sqlalchemy import Column, Integer, String, Date, Time
from database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String)
    start_date = Column(Date)
    end_date = Column(Date)
    days = Column(String)
    start_time = Column(Time)
    end_time = Column(Time)
    location = Column(String)
    address = Column(String)
    room = Column(String)
