from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from datetime import datetime, timedelta, date
import logging
import os
from pydantic import BaseModel, ConfigDict
import re

from app.auth import get_current_user
from app.database import get_db, User as UserModel, Trip as TripModel, Feedback as FeedbackModel
from app.schemas import User

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Schémas Pydantic
class FeedbackBase(BaseModel):
    id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    passenger_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TripResponse(BaseModel):
    id: int
    departure_city: str
    destination: str
    date_time: datetime
    return_date: Optional[datetime] = None
    available_seats: int
    price: float
    driver_id: int
    driver_email: Optional[str] = None
    driver_photo: Optional[str] = None
    car_type: Optional[str] = None
    description: Optional[str] = None
    photo_path: Optional[str] = None
    status: str = "planned"
    sexe: Optional[str] = None
    feedbacks: List[FeedbackBase] = []

    model_config = ConfigDict(from_attributes=True)

class StatsResponse(BaseModel):
    total_users: int
    total_trips: int
    new_users_week: int
    recent_trips_week: int

    model_config = ConfigDict(from_attributes=True)

# Utilitaires
def verify_admin(current_user: User = Depends(get_current_user)):
    """Vérifie les privilèges d'administration"""
    if current_user.role != "admin":
        logger.warning(f"Unauthorized admin access attempt by {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def validate_date_range(start_date: str, end_date: str) -> tuple[date, date]:
    """Valide et convertit les dates en objets date"""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        if start > end:
            raise ValueError("start_date must be before end_date")
            
        return start, end
    except ValueError as e:
        logger.warning(f"Invalid date format: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Routes
@router.get("/trips", 
    response_model=List[TripResponse],
    responses={
        200: {"description": "List of trips"},
        400: {"description": "Invalid date format or range"},
        403: {"description": "Forbidden - Admin only"},
        500: {"description": "Internal server error"}
    })
async def get_all_trips(
    start_date: Optional[str] = Query(
        None,
        regex=r"^\d{4}-\d{2}-\d{2}$",
        description="Start date in YYYY-MM-DD format"
    ),
    end_date: Optional[str] = Query(
        None,
        regex=r"^\d{4}-\d{2}-\d{2}$",
        description="End date in YYYY-MM-DD format"
    ),
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """Récupère les trajets avec filtrage optionnel par date et informations du driver"""
    try:
        query = db.query(TripModel).options(
            joinedload(TripModel.feedbacks).joinedload(FeedbackModel.user),
            joinedload(TripModel.driver)
        )
        
        if start_date or end_date:
            start, end = validate_date_range(
                start_date or "1900-01-01",
                end_date or datetime.now().strftime("%Y-%m-%d")
            )
            query = query.filter(
                TripModel.date_time >= start,
                TripModel.date_time <= end + timedelta(days=1)
            )
        
        trips = query.all()
        trips_with_driver = []
        for trip in trips:
            driver = trip.driver
            if driver:
                logger.info(f"Driver data for trip {trip.id}: email={driver.email}, photo_path={driver.photo_path}, sexe={driver.sexe}")
            else:
                logger.warning(f"No driver found for trip ID {trip.id} with driver_id {trip.driver_id}")
            
            trips_with_driver.append(
                TripResponse(
                    id=trip.id,
                    departure_city=trip.departure_city,
                    destination=trip.destination,
                    date_time=trip.date_time,
                    return_date=trip.return_date,
                    available_seats=trip.available_seats,
                    price=trip.price,
                    driver_id=trip.driver_id,
                    driver_email=driver.email if driver else None,
                    driver_photo=driver.photo_path if driver and driver.photo_path else None,
                    car_type=trip.car_type,
                    description=trip.description,
                    photo_path=trip.photo_path,
                    status=getattr(trip, 'status', 'planned'),
                    sexe=trip.sexe if trip.sexe else None,  # Assure que sexe est transmis
                    feedbacks=[
                        FeedbackBase(
                            id=feedback.id,
                            rating=feedback.rating,
                            comment=feedback.comment,
                            created_at=feedback.created_at,
                            passenger_email=feedback.user.email if feedback.user else None
                        ) for feedback in trip.feedbacks
                    ]
                )
            )
        
        logger.info(f"Admin {admin.email} fetched {len(trips)} trips")
        if not trips:
            logger.warning("No trips found in the specified date range")
        return trips_with_driver
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching trips: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/users", 
    response_model=List[User],
    responses={
        200: {"description": "List of users"},
        403: {"description": "Forbidden - Admin only"},
        500: {"description": "Internal server error"}
    })
async def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """Récupère tous les utilisateurs (sauf admin principal)"""
    try:
        users = db.query(UserModel).filter(UserModel.email != "admin@gmail.com").all()
        logger.info(f"Admin {admin.email} fetched {len(users)} users")
        return users
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/stats",
    response_model=StatsResponse,
    responses={
        200: {"description": "Admin statistics"},
        403: {"description": "Forbidden - Admin only"},
        500: {"description": "Internal server error"}
    })
async def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """Récupère les statistiques administratives"""
    try:
        stats = {
            "total_users": db.query(UserModel)
                           .filter(UserModel.email != "admin@gmail.com")
                           .count(),
            "total_trips": db.query(TripModel).count(),
        }

        week_ago = datetime.utcnow() - timedelta(days=7)
        
        stats.update({
            "new_users_week": db.query(UserModel)
                              .filter(
                                  UserModel.created_at >= week_ago,
                                  UserModel.email != "admin@gmail.com"
                              ).count(),
            "recent_trips_week": db.query(TripModel)
                                 .filter(TripModel.created_at >= week_ago)
                                 .count(),
        })

        logger.info(f"Admin {admin.email} accessed stats")
        return stats

    except Exception as e:
        logger.error(f"Error generating stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/users/{user_id}",
    responses={
        200: {"description": "User deleted successfully"},
        403: {"description": "Forbidden - Cannot delete main admin"},
        404: {"description": "User not found"},
        500: {"description": "Internal server error"}
    })
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """Supprime un utilisateur"""
    try:
        db_user = db.query(UserModel).get(user_id)
        
        if not db_user:
            logger.warning(f"User {user_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        if db_user.email == "admin@gmail.com":
            logger.warning(f"Attempt to delete main admin by {admin.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete main admin"
            )

        db.delete(db_user)
        db.commit()
        
        logger.info(f"User {user_id} deleted by {admin.email}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "User deleted successfully"}
        )
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/users/{user_id}/photo",
    responses={
        200: {"description": "Photo updated successfully"},
        400: {"description": "Invalid file"},
        403: {"description": "Forbidden - Admin only"},
        404: {"description": "User not found"},
        500: {"description": "Internal server error"}
    })
async def update_user_photo(
    user_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """Met à jour la photo d'un utilisateur"""
    try:
        db_user = db.query(UserModel).get(user_id)
        if not db_user:
            logger.warning(f"User {user_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if db_user.email == "admin@gmail.com":
            logger.warning(f"Attempt to update admin photo by {admin.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update admin photo"
            )

        os.makedirs("uploads", exist_ok=True)
        
        file_ext = os.path.splitext(photo.filename)[1]
        unique_filename = f"user_{user_id}_{int(datetime.now().timestamp())}{file_ext}"
        filepath = os.path.join("uploads", unique_filename)
        
        contents = await photo.read()
        with open(filepath, "wb") as f:
            f.write(contents)
        
        db_user.photo_path = filepath
        db.commit()
        
        logger.info(f"Photo updated for user {user_id} by {admin.email}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Photo updated successfully",
                "filepath": filepath
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating photo: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
