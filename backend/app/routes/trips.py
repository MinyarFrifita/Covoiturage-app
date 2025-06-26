from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user, create_access_token
from ..database import get_db
from ..schemas import TripCreate, Trip, BookingCreate, Booking
from ..database import Trip as TripModel, Booking as BookingModel
from sqlalchemy.orm import Session
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()

@router.post("/", response_model=Trip)
def create_trip(trip: TripCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can create trips")
    db_trip = TripModel(
        departure_city=trip.departure_city,
        destination=trip.destination,
        date_time=trip.date_time,
        available_seats=trip.available_seats,
        price=trip.price,
        driver_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return Trip.from_orm(db_trip)

@router.get("/", response_model=list[Trip])
def get_trips(db: Session = Depends(get_db)):
    return [Trip.from_orm(trip) for trip in db.query(TripModel).filter(TripModel.available_seats > 0).all()]

@router.get("/my", response_model=list[Trip])
def get_my_trips(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can view their trips")
    return [Trip.from_orm(trip) for trip in db.query(TripModel).filter(TripModel.driver_id == current_user.id).all()]

@router.put("/{trip_id}", response_model=Trip)
def update_trip(trip_id: int, trip: TripCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can update trips")
    db_trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.driver_id == current_user.id).first()
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found or not authorized")
    db_trip.departure_city = trip.departure_city
    db_trip.destination = trip.destination
    db_trip.date_time = trip.date_time
    db_trip.available_seats = trip.available_seats
    db_trip.price = trip.price
    db.commit()
    db.refresh(db_trip)
    return Trip.from_orm(db_trip)

@router.delete("/{trip_id}")
def delete_trip(trip_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can delete trips")
    db_trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.driver_id == current_user.id).first()
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found or not authorized")
  
    db.query(BookingModel).filter(BookingModel.trip_id == trip_id).delete()
    db.delete(db_trip)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete trip: {str(e)}")
    return {"message": "Trip deleted successfully"}

@router.post("/book", response_model=Booking)
def book_trip(booking: BookingCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can book trips")
    trip = db.query(TripModel).filter(TripModel.id == booking.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if booking.seats_booked <= 0:
        raise HTTPException(status_code=400, detail="Seats booked must be positive")
    if trip.available_seats < booking.seats_booked:
        raise HTTPException(status_code=400, detail="Not enough available seats")
    
    db_booking = BookingModel(
        trip_id=booking.trip_id,
        passenger_id=current_user.id,
        seats_booked=booking.seats_booked,
        created_at=datetime.utcnow()
    )
    trip.available_seats -= booking.seats_booked
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    trip_details = {
        "departure_city": trip.departure_city,
        "destination": trip.destination,
        "date_time": trip.date_time,
        "seats_booked": booking.seats_booked,
        "price": trip.price
    }
    if current_user.email:
        send_booking_confirmation_email(current_user.email, trip_details)
    else:
        raise HTTPException(status_code=400, detail="No email found for passenger")

    return Booking.from_orm(db_booking)

def send_booking_confirmation_email(passenger_email, trip_details):
    EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        raise ValueError("EMAIL_ADDRESS and EMAIL_PASSWORD must be set in .env")
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587

    msg = MIMEText(f"""
    Subject: Confirmation de votre réservation

    Cher(e) utilisateur,

    Votre réservation a été confirmée avec succès !
    Détails du trajet :
    - Départ : {trip_details['departure_city']}
    - Destination : {trip_details['destination']}
    - Date et heure : {trip_details['date_time'].strftime('%Y-%m-%d %H:%M')}
    - Sièges réservés : {trip_details['seats_booked']}
    - Prix total : {trip_details['price'] * trip_details['seats_booked']:.2f} €

    Merci de votre confiance !

    Cordialement,
    L'équipe Covoiturage-app
    """)
    msg['Subject'] = 'Confirmation de votre réservation'
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = passenger_email

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send confirmation email: {str(e)}")
