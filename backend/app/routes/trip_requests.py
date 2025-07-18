from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, select
from typing import List
from datetime import datetime, timedelta
import logging

from ..auth import get_current_user
from ..database import get_db, TripRequest, Trip as TripModel
from ..schemas import TripRequest as schemas_TripRequest, TripRequestBase, User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/trip-requests",
    tags=["trip-requests"]
)

@router.get("/", response_model=List[schemas_TripRequest])
def get_all_trip_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    logger.info(f"Admin {current_user.email} retrieved all trip requests")
    return db.query(TripRequest).options(joinedload(TripRequest.passenger)).all()

@router.post("/", response_model=schemas_TripRequest)
def create_trip_request(
    trip_request: TripRequestBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can request trips")

    current_time = datetime.utcnow()
    if trip_request.date_time and trip_request.date_time < current_time:
        raise HTTPException(status_code=400, detail="Trip request date cannot be in the past")

    matching_trip = db.query(TripModel).filter(
        TripModel.departure_city == trip_request.departure_city,
        TripModel.destination == trip_request.destination,
        TripModel.date_time >= trip_request.date_time - timedelta(minutes=30),
        TripModel.date_time <= trip_request.date_time + timedelta(minutes=30),
        TripModel.available_seats > 0,
        TripModel.status == "planned"
    ).options(joinedload(TripModel.driver)).first()

    db_request = TripRequest(
        departure_city=trip_request.departure_city,
        destination=trip_request.destination,
        date_time=trip_request.date_time,
        sexe=trip_request.sexe,
        passenger_id=current_user.id,
        created_at=datetime.utcnow(),
        trip_id=matching_trip.id if matching_trip else None,
        status="pending" if not matching_trip else "matched"
    )
    
    try:
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        logger.info(f"Passenger {current_user.email} created trip request: {db_request.id} (trip_id: {db_request.trip_id}, status: {db_request.status})")
        return db_request
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create trip request for {current_user.email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create trip request: {str(e)}")

@router.get("/me", response_model=List[schemas_TripRequest])
def get_my_trip_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can view their requests")
    
    current_time = datetime.utcnow()
    requests = db.query(TripRequest).filter(
        TripRequest.passenger_id == current_user.id,
        TripRequest.date_time >= current_time
    ).options(joinedload(TripRequest.trip)).all()
    logger.info(f"Passenger {current_user.email} retrieved {len(requests)} trip requests")
    return requests

@router.get("/driver", response_model=List[schemas_TripRequest])
def get_requests_matching_driver(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can view matching trip requests")
    
    current_time = datetime.utcnow()
    stmt = (
        select(TripRequest)
        .options(joinedload(TripRequest.passenger))
        .filter(
            TripRequest.trip_id == None,
            TripRequest.date_time >= current_time,
            TripRequest.status == "pending"
        )
    )
    requests = db.execute(stmt).scalars().all()
    
    if current_user.sexe:
        requests = [req for req in requests if req.sexe == current_user.sexe or not req.sexe]
    
    logger.info(f"Driver {current_user.email} retrieved {len(requests)} unassigned trip requests")
    return requests
