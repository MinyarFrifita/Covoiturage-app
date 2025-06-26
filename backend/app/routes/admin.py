from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..database import get_db
from ..database import User as UserModel, Trip as TripModel
from ..schemas import User, Trip
from sqlalchemy.orm import Session
import logging

# Configurer le logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/users", response_model=list[User])
def get_all_users(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.email != "admin@gmail.com":
        raise HTTPException(status_code=403, detail="Only admin@gmail.com can access this")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all users")
    return [User.from_orm(user) for user in db.query(UserModel).all()]

@router.get("/trips", response_model=list[Trip])
def get_all_trips(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.email != "admin@gmail.com":
        raise HTTPException(status_code=403, detail="Only admin@gmail.com can access this")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all trips")
    return [Trip.from_orm(trip) for trip in db.query(TripModel).all()]

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.email != "admin@gmail.com":
        raise HTTPException(status_code=403, detail="Only admin@gmail.com can delete users")
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    
    # Trouver dynamiquement l'admin_user_id avec validation stricte
    admin_user = db.query(UserModel).filter(UserModel.email == "admin@gmail.com").first()
    if not admin_user:
        raise HTTPException(status_code=500, detail="Admin user (admin@gmail.com) not found. Please create it first.")
    admin_user_id = admin_user.id
    if admin_user_id is None:
        raise HTTPException(status_code=500, detail="Invalid admin_user_id detected")
    
    # Vérifier et mettre à jour les trips associés
    trips_to_update = db.query(TripModel).filter(TripModel.driver_id == user_id).all()
    if trips_to_update:
        for trip in trips_to_update:
            if trip.driver_id is None:
                logger.error(f"Invalid driver_id (None) found for trip {trip.id}")
                raise HTTPException(status_code=400, detail=f"Trip {trip.id} has an invalid driver_id")
            trip.driver_id = admin_user_id
            db.add(trip)
            logger.info(f"Updated trip {trip.id} with driver_id {admin_user_id}")
    
    # Supprimer l'utilisateur
    db.delete(db_user)
    try:
        db.commit()
        logger.info(f"Successfully deleted user {user_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")
    return {"message": "User deleted successfully"}
