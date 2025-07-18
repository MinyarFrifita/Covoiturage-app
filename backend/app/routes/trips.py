from fastapi import APIRouter, Depends, HTTPException, Form, Query
from fastapi.responses import FileResponse, RedirectResponse
from ..auth import get_current_user
from ..database import get_db, Trip as TripModel, Booking as BookingModel, User as UserModel, Feedback as FeedbackModel, Notification as NotificationModel
from ..schemas import TripCreate, Trip, BookingCreate, Booking, UserBase, PaginatedTripResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
import pytz
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from dotenv import load_dotenv
import os
import logging
from typing import Optional, List

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
if not SENDGRID_API_KEY:
    logger.warning("SENDGRID_API_KEY not found in environment variables. Email sending will be disabled.")
SG_CLIENT = SendGridAPIClient(SENDGRID_API_KEY) if SENDGRID_API_KEY else None
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@covoiturage-app.com")
if not EMAIL_FROM.startswith("verified@") and SG_CLIENT:
    logger.warning(f"Email from {EMAIL_FROM} may not be verified with SendGrid. Ensure sender authentication is set up.")

# Définir un chemin absolu pour les uploads (géré via users maintenant)
BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
os.makedirs(os.path.join(BASE_UPLOAD_DIR, "users"), exist_ok=True)

router = APIRouter(
    prefix="/trips",
    tags=["trips"]
)

def make_aware(dt):
    """Convertit un datetime naive en datetime aware avec UTC"""
    if dt.tzinfo is None:
        return pytz.UTC.localize(dt)
    return dt

def update_trip_status(trip: TripModel, db: Session):
    """Met à jour le statut d'un trip en fonction de la date actuelle"""
    current_time = make_aware(datetime.utcnow())
    trip_date = make_aware(trip.date_time) if trip.date_time else current_time
    return_date = make_aware(trip.return_date) if trip.return_date else None
    
    if trip.status == "planned" and trip_date < current_time:
        if return_date and return_date < current_time:
            trip.status = "completed"
        else:
            trip.status = "in_progress"
        try:
            db.commit()
            logger.info(f"Updated trip {trip.id} status to {trip.status}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update status for trip {trip.id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update trip status")

@router.post("/", response_model=Trip)
async def create_trip(
    departure_city: str = Form(...),
    destination: str = Form(...),
    date_time: str = Form(...),
    available_seats: int = Form(...),
    price: float = Form(...),
    car_type: str = Form(None),
    description: str = Form(None),
    return_date: str = Form(None),
    sexe: str = Form(None),
    custom_notification_message: str = Form(None),
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau trip pour un conducteur authentifié."""
    logger.info(f"Creating trip for {current_user.email}: {departure_city} to {destination}")
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can create trips")
    if not all([current_user.email, current_user.role, getattr(current_user, 'sexe', None)]):
        raise HTTPException(status_code=400, detail="Driver information (email, role, sexe) must be complete")

    try:
        trip_date = make_aware(datetime.fromisoformat(date_time.replace('Z', '+00:00') if 'Z' in date_time else date_time))
        current_time = make_aware(datetime.utcnow())
        if trip_date < current_time:
            raise ValueError("Trip date cannot be in the past")
        return_date_obj = make_aware(datetime.fromisoformat(return_date.replace('Z', '+00:00'))) if return_date and return_date.strip() else None
        if return_date_obj and return_date_obj < current_time:
            raise ValueError("Return date cannot be in the past")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format or value: {str(e)}. Use ISO 8601 (e.g., 2025-07-08T11:13:00+02:00)")

    if available_seats < 0:
        raise HTTPException(status_code=400, detail="Available seats cannot be negative")
    if price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    db_trip = TripModel(
        departure_city=departure_city,
        destination=destination,
        date_time=trip_date,
        available_seats=available_seats,
        price=price,
        driver_id=current_user.id,
        created_at=make_aware(datetime.utcnow()),
        car_type=car_type,
        description=description,
        return_date=return_date_obj,
        status="planned",
        sexe=sexe,
        custom_notification_message=custom_notification_message
    )
    db.add(db_trip)
    try:
        db.commit()
        db.refresh(db_trip)
        logger.info(f"Trip created successfully for {current_user.email}: ID {db_trip.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create trip for {current_user.email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create trip")
    return Trip.from_orm(db_trip)

@router.get("/", response_model=PaginatedTripResponse)
async def get_trips(
    page: int = Query(1, ge=1),
    per_page: int = Query(5, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserBase = Depends(get_current_user)
):
    """Récupère la liste des trips disponibles (tous ou du conducteur si spécifié)."""
    offset = (page - 1) * per_page
    total = db.query(TripModel).filter(
        TripModel.available_seats > 0,
        TripModel.date_time >= make_aware(datetime.utcnow())
    ).count()
    trips = db.query(TripModel).options(joinedload(TripModel.driver)).filter(
        TripModel.available_seats > 0,
        TripModel.date_time >= make_aware(datetime.utcnow())
    ).offset(offset).limit(per_page).all()
    for trip in trips:
        update_trip_status(trip, db)
    return {"results": [Trip.from_orm(trip) for trip in trips], "total": total}

@router.get("/booked", response_model=PaginatedTripResponse)
async def get_my_trips(
    page: int = Query(1, ge=1),
    per_page: int = Query(5, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserBase = Depends(get_current_user)
):
    """Récupère la liste des trips réservés par l'utilisateur actuel."""
    offset = (page - 1) * per_page
    total = db.query(BookingModel).filter(BookingModel.passenger_id == current_user.id).count()
    bookings = db.query(BookingModel).filter(BookingModel.passenger_id == current_user.id).offset(offset).limit(per_page).all()
    trip_ids = [booking.trip_id for booking in bookings]
    trips = db.query(TripModel).options(joinedload(TripModel.driver)).filter(TripModel.id.in_(trip_ids)).all()
    for trip in trips:
        update_trip_status(trip, db)
    return {"results": [Trip.from_orm(trip) for trip in trips], "total": total}

@router.post("/{trip_id}/book", response_model=Booking)
async def book_trip(
    trip_id: int,
    seats_booked: int = Form(...),
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Réserve des places pour un trip spécifique."""
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.available_seats < seats_booked:
        raise HTTPException(status_code=400, detail=f"Only {trip.available_seats} seat(s) available")
    if seats_booked <= 0:
        raise HTTPException(status_code=400, detail="Seats booked must be positive")

    # Supprimons booking_date si ce champ n'existe pas dans BookingModel
    booking = BookingModel(
        trip_id=trip_id,
        passenger_id=current_user.id,
        seats_booked=seats_booked
    )
    trip.available_seats -= seats_booked
    db.add(booking)
    try:
        db.commit()
        db.refresh(booking)
        logger.info(f"Booking created for trip {trip_id} by {current_user.email}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to book trip {trip_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to book trip")
    return Booking.from_orm(booking)

@router.get("/{trip_id}/photo")
async def serve_trip_photo(trip_id: int, db: Session = Depends(get_db), current_user: UserBase = Depends(get_current_user)):
    """Redirige vers la photo du conducteur du trip."""
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip or not trip.driver_id:
        raise HTTPException(status_code=404, detail="Trip or driver not found")
    return RedirectResponse(url=f"/users/{trip.driver_id}/photo", status_code=307)

@router.post("/{trip_id}/cancel", response_model=dict)
async def cancel_booking(
    trip_id: int,
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Annule une réservation pour un trip spécifique."""
    booking = db.query(BookingModel).filter(
        BookingModel.trip_id == trip_id,
        BookingModel.passenger_id == current_user.id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip.available_seats += booking.seats_booked
    db.delete(booking)
    try:
        db.commit()
        logger.info(f"Booking cancelled for trip {trip_id} by {current_user.email}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to cancel booking for trip {trip_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel booking")
    return {"message": "Booking cancelled successfully"}

@router.post("/{trip_id}/feedback", response_model=dict)
async def submit_feedback(
    trip_id: int,
    comment: str = Form(...),
    rating: int = Form(..., ge=1, le=5),
    current_user: UserBase = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soumet un feedback pour un trip spécifique."""
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status != "completed":
        raise HTTPException(status_code=400, detail="Feedback can only be submitted for completed trips")

    feedback = FeedbackModel(
        trip_id=trip_id,
        user_id=current_user.id,
        comment=comment,
        rating=rating,
        created_at=make_aware(datetime.utcnow())
    )
    db.add(feedback)
    try:
        db.commit()
        logger.info(f"Feedback submitted for trip {trip_id} by {current_user.email}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to submit feedback for trip {trip_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
    return {"message": "Feedback submitted successfully"}
