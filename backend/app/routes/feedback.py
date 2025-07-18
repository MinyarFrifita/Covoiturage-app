from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..database import get_db, Feedback as FeedbackModel, Trip as TripModel, Booking as BookingModel
from ..schemas import FeedbackCreate, Feedback
from sqlalchemy.orm import Session
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/feedback/feedback",
    tags=["feedback"]
)

@router.post("/", response_model=Feedback)
def create_feedback(
    feedback: FeedbackCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not feedback.trip_id:
        raise HTTPException(status_code=400, detail="trip_id is required")

    if current_user.role != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can submit feedback")

    trip = db.query(TripModel).filter(TripModel.id == feedback.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status != "completed":
        raise HTTPException(status_code=400, detail="Feedback can only be submitted for completed trips")

    booking = db.query(BookingModel).filter(
        BookingModel.trip_id == feedback.trip_id,
        BookingModel.passenger_id == current_user.id
    ).first()
    if not booking:
        raise HTTPException(status_code=403, detail="You must have a booking for this trip to submit feedback")

    if not 1 <= feedback.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    db_feedback = FeedbackModel(
        user_id=current_user.id,
        trip_id=feedback.trip_id,
        booking_id=booking.id,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=datetime.utcnow()
    )
    db.add(db_feedback)
    try:
        db.commit()
        db.refresh(db_feedback)
        logger.info(f"Feedback created for trip_id={feedback.trip_id}, user_id={current_user.id}, comment={feedback.comment}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create feedback for trip {feedback.trip_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create feedback")
    return Feedback.from_orm(db_feedback)

@router.get("/trip/{trip_id}", response_model=list[Feedback])
def get_feedback_by_trip(
    trip_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not hasattr(current_user, 'role') or current_user.role != "driver":
        logger.warning(f"Access denied for user {current_user.email} with role {getattr(current_user, 'role', 'None')}")
        raise HTTPException(status_code=403, detail="Only drivers can view feedback")
    
    trip = db.query(TripModel).filter(TripModel.id == trip_id, TripModel.driver_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or not authorized")

    feedbacks = db.query(FeedbackModel).filter(FeedbackModel.trip_id == trip_id).all()
    logger.info(f"Retrieved {len(feedbacks)} feedbacks for trip_id={trip_id}: {[f.comment for f in feedbacks if f.comment]}")
    return [Feedback.from_orm(feedback) for feedback in feedbacks]
