from __future__ import annotations  # Pour éviter les problèmes de typage circulaire

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

class UserRole(str, Enum):
    driver = "driver"
    passenger = "passenger"
    admin = "admin"

# Définir UserBase en premier pour éviter les références circulaires
class UserBase(BaseModel):
    id: int
    email: str
    role: UserRole
    sexe: Optional[str] = None
    photo_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str  # email utilisé comme username
    password: str

    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: str

    model_config = ConfigDict(from_attributes=True)

class User(UserBase):
    id: int
    created_at: datetime
    

    model_config = ConfigDict(from_attributes=True)

class TripStatus(str, Enum):
    planned = "planned"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class TripBase(BaseModel):
    departure_city: str
    destination: str
    date_time: datetime
    available_seats: int
    price: float
    car_type: Optional[str] = None
    description: Optional[str] = None
    return_date: Optional[datetime] = None
    photo_path: Optional[str] = None
    status: str
    sexe: Optional[str] = None
    status: TripStatus = TripStatus.planned
    model_config = ConfigDict(from_attributes=True)

class TripCreate(TripBase):
    car_type: Optional[str] = None
    photo_path: Optional[str] = None
    description: Optional[str] = None
    return_date: Optional[datetime] = None
    sexe: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class Trip(TripCreate):
    id: int
    driver_id: int
    created_at: datetime
    status: TripStatus
    driver: Optional[UserBase] = None  
    bookings: List[Booking] = []
    feedbacks: List[dict] = []  
    model_config = ConfigDict(from_attributes=True)

class TripResponse(BaseModel):
    id: int
    departure_city: str
    destination: str
    date_time: str
    available_seats: inta
    price: float
    driver_id: int
    created_at: str
    car_type: Optional[str] = None
    description: Optional[str] = None
    return_date: Optional[str] = None
    photo_path: Optional[str] = None
    status: str = "planned" 
    sexe: Optional[str] = None
    driver: Optional[dict] = None
    bookings: list = []
    feedbacks: list = []
    model_config = ConfigDict(from_attributes=True)
   

class BookingBase(BaseModel):
    trip_id: int
    seats_booked: int

    model_config = ConfigDict(from_attributes=True)

class BookingCreate(BookingBase):
    pass

    model_config = ConfigDict(from_attributes=True)

class Booking(BookingBase):
    id: int
    passenger_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

    model_config = ConfigDict(from_attributes=True)

class TripRequestBase(BaseModel):
    departure_city: str
    destination: str
    date_time: datetime
    sexe: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TripRequest(TripRequestBase):
    id: int
    passenger_id: int
    created_at: datetime
    trip_id: Optional[int] = None
    passenger: Optional[UserBase] = None

    model_config = ConfigDict(from_attributes=True)

class NotificationCreate(BaseModel):
    passenger_id: int
    message: str
    trip_id: Optional[int] = None  

    model_config = ConfigDict(from_attributes=True)

class Notification(NotificationCreate):
    id: int
    driver_id: int
    created_at: datetime
    email_status: Optional[str] = "pending"

    model_config = ConfigDict(from_attributes=True)

class FeedbackBase(BaseModel):
    trip_id: int
    rating: int
    comment: Optional[str] = None
    booking_id: Optional[int] = None
    passenger_email: Optional[str] = None  
    model_config = ConfigDict(from_attributes=True)

class FeedbackCreate(FeedbackBase):
    pass

    model_config = ConfigDict(from_attributes=True)

class Feedback(FeedbackBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Reconstruction des modèles après toutes les définitions
Trip.model_rebuild()
User.model_rebuild()
