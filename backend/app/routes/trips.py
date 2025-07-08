from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from ..auth import get_current_user
from ..database import get_db, Trip as TripModel, Booking as BookingModel, User as UserModel, Feedback as FeedbackModel, Notification as NotificationModel
from ..schemas import TripCreate, Trip, BookingCreate, Booking, User as UserSchema, UserBase, Feedback, NotificationCreate
from sqlalchemy.orm import Session
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from dotenv import load_dotenv
import os
import logging

# Charger les variables d'environnement
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration globale de SendGrid
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
if not SENDGRID_API_KEY:
    logger.warning("SENDGRID_API_KEY not found in environment variables. Email sending will be disabled.")
SG_CLIENT = SendGridAPIClient(SENDGRID_API_KEY) if SENDGRID_API_KEY else None
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@covoiturage-app.com")
if not EMAIL_FROM.startswith("verified@") and SG_CLIENT:
    logger.warning(f"Email from {EMAIL_FROM} may not be verified with SendGrid. Ensure sender authentication is set up.")

router = APIRouter(
    prefix="/trips",
    tags=["trips"]
)

async def save_photo(photo: UploadFile, upload_dir: str) -> str:
    """Fonction asynchrone pour sauvegarder la photo."""
    os.makedirs(upload_dir, exist_ok=True)
    photo_path = os.path.join(upload_dir, f"{int(datetime.utcnow().timestamp())}_{photo.filename}")
    try:
        content = await photo.read()
        with open(photo_path, "wb") as buffer:
            buffer.write(content)
        logger.info(f"Photo saved successfully at {photo_path}")
        return photo_path
    except Exception as e:
        logger.error(f"Failed to save photo to {photo_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save photo: {str(e)}")

def update_trip_status(trip: TripModel, db: Session):
    """Mise à jour automatique du statut du trip en fonction de la date."""
    current_time = datetime.utcnow()
    if trip.status == "planned" and trip.date_time < current_time:
        if trip.return_date and trip.return_date < current_time:
            trip.status = "completed"
        else:
            trip.status = "in_progress" if trip.date_time < current_time else "planned"
        db.commit()
        logger.info(f"Updated trip {trip.id} status to {trip.status}")

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
    photo: UploadFile = File(None),
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Creating trip for {current_user.email}: {departure_city} to {destination}")
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can create trips")
    if not all([current_user.email, current_user.role, getattr(current_user, 'sexe', None)]):
        raise HTTPException(status_code=400, detail="Driver information (email, role, sexe) must be complete")

    try:
        trip_date = datetime.fromisoformat(date_time.replace('Z', '+00:00') if 'Z' in date_time else date_time)
        current_time = datetime.utcnow()
        if trip_date < current_time:
            raise ValueError("Trip date cannot be in the past")
        return_date_obj = datetime.fromisoformat(return_date.replace('Z', '+00:00')) if return_date and return_date.strip() else None
        if return_date_obj and return_date_obj < current_time:
            raise ValueError("Return date cannot be in the past")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format or value: {str(e)}. Use ISO 8601 (e.g., 2025-07-08T11:13:00+02:00)")

    if available_seats < 0:
        raise HTTPException(status_code=400, detail="Available seats cannot be negative")
    if price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    photo_path = None
    if photo:
        photo_path = await save_photo(photo, "uploads")

    db_trip = TripModel(
        departure_city=departure_city,
        destination=destination,
        date_time=trip_date,
        available_seats=available_seats,
        price=price,
        driver_id=current_user.id,
        created_at=datetime.utcnow(),
        car_type=car_type,
        description=description,
        return_date=return_date_obj,
        photo_path=photo_path,
        status="planned",
        sexe=sexe
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

@router.get("/", response_model=list[Trip])
def get_trips(db: Session = Depends(get_db), current_user: UserSchema = Depends(get_current_user)):
    if current_user.role not in ["passenger", "driver", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    current_time = datetime.utcnow()
    trips = db.query(TripModel).join(UserModel, TripModel.driver_id == UserModel.id).filter(
        TripModel.available_seats > 0,
        TripModel.date_time >= current_time
    ).all()
    for trip in trips:
        update_trip_status(trip, db)
    return [
        Trip(
            id=trip.id,
            driver_id=trip.driver_id,
            departure_city=trip.departure_city,
            destination=trip.destination,
            date_time=trip.date_time,
            available_seats=trip.available_seats,
            price=trip.price,
            created_at=trip.created_at,
            car_type=trip.car_type,
            description=trip.description,
            return_date=trip.return_date,
            photo_path=trip.photo_path,
            status=trip.status,
            sexe=trip.sexe,
            driver=UserBase.from_orm(trip.driver) if trip.driver else None,
            bookings=[Booking.from_orm(b) for b in trip.bookings],
            feedbacks=[
                {
                    "id": f.id,
                    "user_id": f.user_id,
                    "trip_id": f.trip_id,
                    "rating": f.rating,
                    "comment": f.comment,
                    "created_at": f.created_at,
                    "passenger_email": db.query(UserModel).filter(UserModel.id == f.user_id).first().email if f.user_id else "unknown"
                }
                for f in trip.feedbacks
            ]
        )
        for trip in trips
        if trip.driver and trip.driver.email and trip.driver.role and trip.driver.sexe
    ]

@router.get("/my", response_model=list[Trip])
def get_my_trips(current_user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can view their trips")
    current_time = datetime.utcnow()
    trips = db.query(TripModel).filter(
        TripModel.driver_id == current_user.id,
        TripModel.date_time >= current_time
    ).all()
    for trip in trips:
        update_trip_status(trip, db)
    logger.info(f"Driver {current_user.email} retrieved {len(trips)} trips")
    return [
        Trip(
            id=trip.id,
            driver_id=trip.driver_id,
            departure_city=trip.departure_city,
            destination=trip.destination,
            date_time=trip.date_time,
            available_seats=trip.available_seats,
            price=trip.price,
            created_at=trip.created_at,
            car_type=trip.car_type,
            description=trip.description,
            return_date=trip.return_date,
            photo_path=trip.photo_path,
            status=trip.status,
            sexe=trip.sexe,
            driver=UserBase.from_orm(trip.driver) if trip.driver else None,
            bookings=[Booking.from_orm(b) for b in trip.bookings],
            feedbacks=[
                {
                    "id": f.id,
                    "user_id": f.user_id,
                    "trip_id": f.trip_id,
                    "rating": f.rating,
                    "comment": f.comment,
                    "created_at": f.created_at,
                    "passenger_email": db.query(UserModel).filter(UserModel.id == f.user_id).first().email if f.user_id else "unknown"
                }
                for f in trip.feedbacks
            ]
        )
        for trip in trips
    ]

@router.get("/admin", response_model=list[Trip])
def get_admin_trips(db: Session = Depends(get_db), current_user: UserSchema = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all trips")
    trips = db.query(TripModel).join(UserModel, TripModel.driver_id == UserModel.id).all()
    for trip in trips:
        update_trip_status(trip, db)
    return [
        Trip(
            id=trip.id,
            driver_id=trip.driver_id,
            departure_city=trip.departure_city,
            destination=trip.destination,
            date_time=trip.date_time,
            available_seats=trip.available_seats,
            price=trip.price,
            created_at=trip.created_at,
            car_type=trip.car_type,
            description=trip.description,
            return_date=trip.return_date,
            photo_path=trip.photo_path,
            status=trip.status,
            sexe=trip.sexe,
            driver=UserBase.from_orm(trip.driver) if trip.driver else None,
            bookings=[Booking.from_orm(b) for b in trip.bookings],
            feedbacks=[
                {
                    "id": f.id,
                    "user_id": f.user_id,
                    "trip_id": f.trip_id,
                    "rating": f.rating,
                    "comment": f.comment,
                    "created_at": f.created_at,
                    "passenger_email": db.query(UserModel).filter(UserModel.id == f.user_id).first().email if f.user_id else "unknown"
                }
                for f in trip.feedbacks
            ]
        )
        for trip in trips
        if trip.driver
    ]

@router.put("/{trip_id}", response_model=Trip)
async def update_trip(
    trip_id: int,
    departure_city: str = Form(None),
    destination: str = Form(None),
    date_time: str = Form(None),
    available_seats: int = Form(None),
    price: float = Form(None),
    car_type: str = Form(None),
    description: str = Form(None),
    return_date: str = Form(None),
    sexe: str = Form(None),
    photo: UploadFile = File(None),
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can update trips")
    db_trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.driver_id == current_user.id).first()
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found or not authorized")
    logger.info(f"Updating trip {trip_id} for {current_user.email}")

    if departure_city is None:
        departure_city = db_trip.departure_city
    if destination is None:
        destination = db_trip.destination
    if date_time is None:
        date_time = db_trip.date_time.isoformat().replace('+00:00', 'Z')
    if available_seats is None:
        available_seats = db_trip.available_seats
    if price is None:
        price = db_trip.price
    if car_type is None:
        car_type = db_trip.car_type
    if description is None:
        description = db_trip.description
    if return_date is None:
        return_date = db_trip.return_date.isoformat().replace('+00:00', 'Z') if db_trip.return_date else None
    if sexe is None:
        sexe = db_trip.sexe

    try:
        trip_date = datetime.fromisoformat(date_time.replace('Z', '+00:00') if date_time else db_trip.date_time.isoformat())
        current_time = datetime.utcnow()
        if trip_date < current_time:
            raise ValueError("Trip date cannot be in the past")
        return_date_obj = datetime.fromisoformat(return_date.replace('Z', '+00:00')) if return_date and return_date.strip() else db_trip.return_date
        if return_date_obj and return_date_obj < current_time:
            raise ValueError("Return date cannot be in the past")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format or value: {str(e)}. Use ISO 8601 (e.g., 2025-07-08T11:13:00+02:00)")

    if available_seats < 0:
        raise HTTPException(status_code=400, detail="Available seats cannot be negative")
    if price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    if photo:
        photo_path = await save_photo(photo, "uploads")
        db_trip.photo_path = photo_path

    db_trip.departure_city = departure_city
    db_trip.destination = destination
    db_trip.date_time = trip_date
    db_trip.available_seats = available_seats
    db_trip.price = price
    db_trip.car_type = car_type
    db_trip.description = description
    db_trip.return_date = return_date_obj
    db_trip.sexe = sexe

    update_trip_status(db_trip, db)
    try:
        db.commit()
        db.refresh(db_trip)
        logger.info(f"Trip {trip_id} updated successfully for {current_user.email}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update trip {trip_id} for {current_user.email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update trip: {str(e)}")
    return Trip.from_orm(db_trip)

@router.delete("/{trip_id}")
def delete_trip(trip_id: int, current_user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can delete trips")
    db_trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.driver_id == current_user.id).first()
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found or not authorized")
    if db.query(BookingModel).filter(BookingModel.trip_id == trip_id).count() > 0:
        raise HTTPException(status_code=400, detail="Cannot delete trip with associated bookings")
    if db.query(FeedbackModel).filter(FeedbackModel.trip_id == trip_id).count() > 0:
        raise HTTPException(status_code=400, detail="Cannot delete trip with associated feedbacks")
    db.query(BookingModel).filter(BookingModel.trip_id == trip_id).delete()
    db.delete(db_trip)
    try:
        db.commit()
        logger.info(f"Trip {trip_id} deleted successfully by {current_user.email}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete trip {trip_id} for {current_user.email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete trip: {str(e)}")
    return {"message": "Trip deleted successfully"}

@router.post("/{trip_id}/book", response_model=Booking)
def book_trip(
    trip_id: int,
    seats_booked: int = Form(...),
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can book trips")
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if seats_booked <= 0:
        raise HTTPException(status_code=400, detail="Seats booked must be positive")
    if seats_booked > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 seats can be booked per reservation")
    if trip.available_seats < seats_booked:
        raise HTTPException(status_code=400, detail="Not enough available seats")

    db_booking = BookingModel(
        trip_id=trip_id,
        passenger_id=current_user.id,
        seats_booked=seats_booked,
        created_at=datetime.utcnow()
    )
    trip.available_seats -= seats_booked
    db.add(db_booking)
    try:
        db.commit()
        db.refresh(db_booking)
        update_trip_status(trip, db)  # Mettre à jour le statut après la réservation
        logger.info(f"Passenger {current_user.email} booked {seats_booked} seats for trip {trip_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to book trip {trip_id} for {current_user.email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to book trip: {str(e)}")

    # Appeler l'endpoint de notification (optionnel, selon ta logique)
    return Booking.from_orm(db_booking)

@router.post("/{trip_id}/notify")
def notify_driver(
    trip_id: int,
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trip = db.query(TripModel).filter(TripModel.id == trip_id).first()
    if not trip or not trip.driver:
        raise HTTPException(status_code=404, detail="Trip or driver not found")
    
    driver = db.query(UserModel).filter(UserModel.id == trip.driver_id).first()
    if not driver or not driver.email:
        raise HTTPException(status_code=400, detail="Driver email not available")

    if not SG_CLIENT:
        logger.warning(f"No SendGrid client available for trip {trip_id}. Email not sent.")
        return {"message": "Booking confirmed, but email sending disabled due to missing API key"}

    try:
        subject = "New Booking Notification"
        content_str = f"""
        Dear {driver.email.split('@')[0]},

        A new booking has been confirmed for your trip!
        Trip Details:
        - Trip ID: {trip_id}
        - Departure: {trip.departure_city}
        - Destination: {trip.destination}
        - Date and Time: {trip.date_time.strftime('%Y-%m-%d %H:%M')}
        - Passenger Email: {current_user.email}
        """
        mail = Mail(
            from_email=Email(EMAIL_FROM, "Covoiturage Team"),
            to_emails=To(driver.email),
            subject=subject
        )
        mail.add_content(Content("text/plain", content_str))
        response = SG_CLIENT.send(mail)
        logger.info(f"Email sent to {driver.email} for booking {trip_id}, status: {response.status_code}")

        # Créer une notification pour le conducteur
        notification = NotificationModel(
            passenger_id=current_user.id,  # L'utilisateur qui a réservé (passager)
            driver_id=trip.driver_id,      # Le conducteur du trip
            trip_id=trip_id,              # Lien avec le trip
            message=f"New booking notification for trip {trip_id}",
            created_at=datetime.utcnow(),
            email_status="sent" if response.status_code == 202 else "failed"
        )
        db.add(notification)
        db.commit()

        return {"message": "Notification sent to driver"}
    except Exception as e:
        logger.error(f"Failed to send email to {driver.email} for booking {trip_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@router.put("/user/{user_id}/photo", response_model=dict)
async def update_user_photo(
    user_id: int,
    photo: UploadFile = File(...),
    current_user: UserSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Route pour mettre à jour la photo d'un utilisateur (conducteur)."""
    if current_user.id != user_id or current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Not authorized to update this user's photo")
    
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    photo_path = await save_photo(photo, "uploads")
    db_user.photo_path = photo_path
    try:
        db.commit()
        db.refresh(db_user)
        logger.info(f"User {user_id} photo updated successfully with path: {photo_path}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update user {user_id} photo: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update photo")

    return {"message": "Photo updated successfully", "photo_path": photo_path}
