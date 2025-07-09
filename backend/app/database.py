from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, Float, ForeignKey, Text,
    CheckConstraint, Enum, Boolean
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func
import os
from dotenv import load_dotenv
import logging
import re

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration de la base de données
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env")
if not re.match(r'^postgresql://', SQLALCHEMY_DATABASE_URL):
    raise ValueError("DATABASE_URL must start with 'postgresql://'")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="passenger")
    sexe = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    photo_path = Column(String(255), nullable=True)
    
    # Relations
    trips = relationship("Trip", back_populates="driver", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="passenger", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    trip_requests = relationship("TripRequest", back_populates="passenger", cascade="all, delete-orphan")
    notifications_sent = relationship(
        "Notification", 
        back_populates="driver", 
        foreign_keys='Notification.driver_id',
        cascade="all, delete-orphan"
    )
    notifications_received = relationship(
        "Notification", 
        back_populates="passenger", 
        foreign_keys='Notification.passenger_id',
        cascade="all, delete-orphan"
    )

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    departure_city = Column(String(100), nullable=False, index=True)
    destination = Column(String(100), nullable=False, index=True)
    date_time = Column(DateTime, nullable=False)
    available_seats = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    photo_path = Column(String(255), nullable=True)
    car_type = Column(String(50), nullable=True)
    description = Column(String(500), nullable=True)
    return_date = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False, default="planned")
    sexe = Column(String(20), nullable=True)
    custom_notification_message = Column(String(500), nullable=True)
    driver = relationship("User", back_populates="trips")
    bookings = relationship("Booking", back_populates="trip", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="trip", cascade="all, delete-orphan")
    trip_requests = relationship("TripRequest", back_populates="trip", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="trip", cascade="all, delete-orphan")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    passenger_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    seats_booked = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, server_default=func.now())
    status = Column(String(20), default="confirmed")

    __table_args__ = (
        CheckConstraint('seats_booked > 0', name='check_seats_booked_positive'),
        CheckConstraint("status IN ('confirmed', 'cancelled', 'completed')", name='check_booking_status')
    )

    trip = relationship("Trip", back_populates="bookings")
    passenger = relationship("User", back_populates="bookings")
    feedback = relationship("Feedback", back_populates="booking", uselist=False, cascade="all, delete-orphan")

class TripRequest(Base):
    __tablename__ = "trip_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    passenger_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    departure_city = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    date_time = Column(DateTime, nullable=False)
    sexe = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    status = Column(String(20), default="pending")
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'accepted', 'rejected')", name='check_request_status'),
    )

    passenger = relationship("User", back_populates="trip_requests")
    trip = relationship("Trip", back_populates="trip_requests")

class Feedback(Base):
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True)
    rating = Column(Integer, nullable=False)
    comment = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint('rating BETWEEN 1 AND 5', name='check_rating_range'),
    )

    user = relationship("User", back_populates="feedbacks")
    trip = relationship("Trip", back_populates="feedbacks")
    booking = relationship("Booking", back_populates="feedback")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    passenger_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    email_status = Column(String(20), default="pending")
    is_read = Column(Boolean, default=False)

    __table_args__ = (
        CheckConstraint("email_status IN ('pending', 'sent', 'failed')", name='check_email_status'),
    )

    passenger = relationship(
        "User", 
        back_populates="notifications_received", 
        foreign_keys=[passenger_id]
    )
    driver = relationship(
        "User", 
        back_populates="notifications_sent", 
        foreign_keys=[driver_id]
    )
    trip = relationship("Trip", back_populates="notifications")

def get_db():
    db = SessionLocal()
    try:
        logger.info("Database session started")
        yield db
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        db.rollback()
        raise
    finally:
        logger.info("Database session closed")
        db.close()

def create_tables():
    """Crée toutes les tables dans la base de données"""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

def drop_tables():
    """Supprime toutes les tables de la base de données (pour les tests)"""
    Base.metadata.drop_all(bind=engine)
    logger.info("Database tables dropped successfully")
