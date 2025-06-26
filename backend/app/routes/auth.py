from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from ..auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from ..database import get_db, User
from ..schemas import UserCreate, Token, Booking
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from jose import jwt, JWTError
from typing import List

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "4e9f8d7c6b5a4e9f8d7c6b5a4e9f8d7c6b5a4e9f8d7c6b5a4e9f8d7c6b5a4e9f"  # Remplace par une clé sécurisée
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/register", response_model=UserCreate)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        password = pwd_context.hash(user.password)
        new_user = User(
            email=user.email,
            role=user.role,
            password=password,  
            created_at=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Database error during registration")

@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.password):  
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserCreate)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/my-bookings", response_model=List[Booking])
def get_my_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "passenger":
        raise HTTPException(status_code=403, detail="Only passengers can view their bookings")
    from ..database import BookingModel
    bookings = db.query(BookingModel).filter(BookingModel.passenger_id == current_user.id).all()
    return [Booking.from_orm(booking) for booking in bookings]

@router.post("/login", response_model=Token)
async def login_post(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
