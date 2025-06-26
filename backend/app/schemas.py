from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    driver = "driver"
    passenger = "passenger"
    admin = "admin"
class UserBase(BaseModel):
    email: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class TripBase(BaseModel):
    departure_city: str
    destination: str 
    date_time: datetime  
    available_seats: int
    price: float

class TripCreate(TripBase):
    pass

class Trip(TripBase):
    id: int
    driver_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BookingBase(BaseModel):
    trip_id: int
    seats_booked: int

class BookingCreate(BookingBase):
    pass

class Booking(BookingBase):
    id: int
    passenger_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
