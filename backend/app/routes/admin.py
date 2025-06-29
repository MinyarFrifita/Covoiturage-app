from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..database import get_db
from ..database import User as UserModel, Trip as TripModel
from ..schemas import User, Trip
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import logging

router = APIRouter()

# Helper function to check admin privileges
def verify_admin(current_user):
    if current_user.email != "admin@gmail.com" or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

@router.get("/users", response_model=List[User])
def get_all_users(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    verify_admin(current_user)
    # Exclure l'admin de la liste
    return [User.from_orm(user) for user in db.query(UserModel).filter(UserModel.email != "admin@gmail.com").all()]

@router.get("/trips", response_model=List[Trip])
def get_all_trips(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    verify_admin(current_user)
    return db.query(TripModel).all()

@router.get("/stats")
def get_admin_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    verify_admin(current_user)
    
    total_users = db.query(UserModel).filter(UserModel.email != "admin@gmail.com").count()
    total_trips = db.query(TripModel).count()
    
    today = datetime.now()
    week_ago = today - timedelta(days=7)
    
    new_users = db.query(UserModel).filter(
        UserModel.created_at >= week_ago,
        UserModel.email != "admin@gmail.com"
    ).count()
    
    recent_trips = db.query(TripModel).filter(
        TripModel.created_at >= week_ago
    ).count()
    
    return {
        "total_users": total_users,
        "total_trips": total_trips,
        "new_users_week": new_users,
        "recent_trips_week": recent_trips
    }

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    verify_admin(current_user)
    
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.email == "admin@gmail.com":
        raise HTTPException(status_code=403, detail="Cannot delete admin user")
    
    # ... (le reste de votre logique de suppression existante)
    
    return {"message": "User deleted successfully"}
