from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..database import get_db, Feedback as FeedbackModel, Trip as TripModel
from ..schemas import FeedbackCreate, Feedback
from sqlalchemy.orm import Session
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/feedback",
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

    # Vérifier le statut du trip
    trip = db.query(TripModel).filter(TripModel.id == feedback.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status != "completed":
        raise HTTPException(status_code=400, detail="Feedback can only be submitted for completed trips")

    db_feedback = FeedbackModel(
        user_id=current_user.id,
        trip_id=feedback.trip_id,
        rating=feedback.rating if hasattr(feedback, 'rating') else 0,
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
    feedbacks = db.query(FeedbackModel).filter(FeedbackModel.trip_id == trip_id).all()
    logger.info(f"Retrieved {len(feedbacks)} feedbacks for trip_id={trip_id}: {[f.comment for f in feedbacks]}")
    return [Feedback.from_orm(feedback) for feedback in feedbacks]
