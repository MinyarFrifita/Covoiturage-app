from __future__ import annotations  # Pour éviter les problèmes de typage circulaire

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

class UserRole(str, Enum):
    driver = "driver"
    passenger = "passenger"
    admin = "admin"

class UserBase(BaseModel):
    id: int
    email: str
    role: UserRole
    sexe: Optional[str] = None
    photo_path: Optional[str] = None  

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str  
    password: str

    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: str

    model_config = ConfigDict(from_attributes=True)

class User(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
class UserResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    sexe: Optional[str] = None
    photo_path: Optional[str] = None
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
    status: TripStatus = TripStatus.planned
    sexe: Optional[str] = None
    custom_notification_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TripCreate(TripBase):
    departure_city: str
    destination: str
    date_time: datetime
    available_seats: int
    price: float
    car_type: Optional[str] = None
    description: Optional[str] = None
    return_date: Optional[datetime] = None
    sexe: Optional[str] = None
    custom_notification_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class Trip(TripCreate):
    id: int
    driver_id: int
    created_at: datetime
    driver: Optional[UserBase] = None
    bookings: List["Booking"] = []
    feedbacks: List["Feedback"] = []

    model_config = ConfigDict(from_attributes=True)

class PaginatedTripResponse(BaseModel):
    """Modèle pour les réponses paginées des trips."""
    results: List[Trip]
    total: int

    model_config = ConfigDict(from_attributes=True)

class TripResponse(BaseModel):
    id: int
    departure_city: str
    destination: str
    date_time: datetime  
    available_seats: int
    price: float
    driver_id: int
    created_at: datetime  
    car_type: Optional[str] = None
    description: Optional[str] = None
    return_date: Optional[datetime] = None 
    status: str
    sexe: Optional[str] = None
    driver: Optional[dict] = None
    bookings: List["Booking"] = []  
    feedbacks: List["Feedback"] = []  

    model_config = ConfigDict(from_attributes=True)

class BookingBase(BaseModel):
    trip_id: int
    passenger_id: int
    seats_booked: int

    model_config = ConfigDict(from_attributes=True)

class BookingCreate(BookingBase):
    pass

    model_config = ConfigDict(from_attributes=True)

class Booking(BookingCreate):
    id: int
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
    driver_id: Optional[int] = None 

    model_config = ConfigDict(from_attributes=True)

class Notification(NotificationCreate):
    id: int
    created_at: datetime
    email_status: Optional[str] = "pending"
    is_read: Optional[bool] = False
    driver_email: Optional[str] = None
    departure_city: Optional[str] = None  
    destination: Optional[str] = None

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

class Feedback(FeedbackCreate):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Reconstruction des modèles après toutes les définitions
Trip.model_rebuild()
User.model_rebuild()
Booking.model_rebuild()
Feedback.model_rebuild()
