from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="schedules")
