from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db, User, TripRequest
from ..auth import get_current_user
from ..schemas import UserResponse
import os
import logging
from fastapi.responses import FileResponse

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

logger = logging.getLogger(__name__)
BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploads"))

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return current_user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Autorisation : utilisateur lui-même, admin, ou driver avec une demande en attente
    if current_user.id != user_id and current_user.role != "admin":
        if current_user.role == "driver":
            request = db.query(TripRequest).filter(
                TripRequest.passenger_id == user_id,
                TripRequest.trip_id == None,
                TripRequest.status == "pending"
            ).first()
            if not request:
                logger.warning(f"Driver {current_user.email} attempted to access profile of user {user_id} without a pending request")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this profile")
        else:
            logger.warning(f"User {current_user.email} attempted to access profile of user {user_id} without permission")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this profile")
    
    return db_user

@router.get("/{user_id}/photo")
async def serve_user_photo(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Autorisation : utilisateur lui-même, admin, ou driver avec une demande en attente
    if current_user.id != user_id and current_user.role != "admin":
        if current_user.role == "driver":
            request = db.query(TripRequest).filter(
                TripRequest.passenger_id == user_id,
                TripRequest.trip_id == None,
                TripRequest.status == "pending"
            ).first()
            if not request:
                logger.warning(f"Driver {current_user.email} attempted to access photo of user {user_id} without a pending request")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this photo")
        else:
            logger.warning(f"User {current_user.email} attempted to access photo of user {user_id} without permission")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this photo")

    if not db_user.photo_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    photo_path = os.path.join(BASE_UPLOAD_DIR, "users", db_user.photo_path)  # Sous-dossier "users"
    if not os.path.exists(photo_path):
        logger.error(f"Photo file not found at {photo_path} for user {user_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found on disk")

    try:
        return FileResponse(
            photo_path,
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=31536000", "Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Error serving photo for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while serving photo")
