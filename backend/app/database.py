from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env")

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
except Exception as e:
    raise ConnectionError(f"Failed to connect to database: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Modèle User
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    created_at = Column(DateTime)
    trips = relationship("Trip", back_populates="driver", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="passenger")

# Modèle Trip
class Trip(Base):
    __tablename__ = "trips"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    departure_city = Column(String, index=True)
    destination = Column(String, index=True)
    date_time = Column(DateTime)
    available_seats = Column(Integer)
    price = Column(Float)
    created_at = Column(DateTime, nullable=False)
    driver = relationship("User", back_populates="trips")
    bookings = relationship("Booking", back_populates="trip")

# Modèle Booking
class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    passenger_id = Column(Integer, ForeignKey("users.id"))
    seats_booked = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime,nullable=False)
    trip = relationship("Trip", back_populates="bookings")
    passenger = relationship("User", back_populates="bookings")

# Fonction pour obtenir une session DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
