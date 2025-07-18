from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from ..auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    verify_recaptcha
)
from ..database import get_db, User
from ..schemas import UserCreate, UserResponse, Token
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import os
import shutil
from typing import Optional
import urllib.parse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploads"))

def save_profile_photo(photo: UploadFile, email: str) -> str:
    """Sauvegarde la photo de profil et retourne un chemin relatif"""
    UPLOAD_DIR = os.path.join(BASE_UPLOAD_DIR, "users")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(photo.filename)[1]
    safe_email = email.replace("@", "_").replace(".", "_")
    filename = f"profile_{safe_email}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        logger.info(f"Profile photo saved successfully at {file_path}")
        return os.path.join("users", filename)  # Retourne un chemin relatif
    except Exception as e:
        logger.error(f"Error saving profile photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not save profile photo: {str(e)}")

@router.post("/register", response_model=Token)
async def register(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    sexe: str = Form(...),
    recaptcha_token: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    logger.info("Received request at /auth/register")
    await verify_recaptcha(recaptcha_token)

    normalized_email = urllib.parse.unquote(email)
    
    if role not in ["driver", "passenger"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'driver' or 'passenger'")
    if sexe not in ["male", "female"]:
        raise HTTPException(status_code=400, detail="Invalid gender. Must be 'male' or 'female'")
    if role == "driver" and not photo:
        raise HTTPException(status_code=400, detail="Profile photo is required for drivers")

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    photo_path = None
    if photo:
        try:
            photo_path = save_profile_photo(photo, normalized_email)
        except Exception as e:
            logger.error(f"Failed to save profile photo: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save profile photo")

    hashed_password = get_password_hash(password)
    new_user = User(
        email=normalized_email,
        password=hashed_password,
        role=role,
        sexe=sexe,
        photo_path=photo_path,
        created_at=datetime.utcnow()
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"User created: {new_user.email} (ID: {new_user.id})")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error creating user: {str(e)}")
        if photo_path and os.path.exists(os.path.join(BASE_UPLOAD_DIR, photo_path)):
            os.remove(os.path.join(BASE_UPLOAD_DIR, photo_path))
        raise HTTPException(status_code=500, detail="Could not create user")

    access_token = create_access_token(data={"sub": normalized_email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    recaptcha_token: str = Form(None)
):
    logger.info("Received request at /auth/token")
    if recaptcha_token:
        await verify_recaptcha(recaptcha_token)

    normalized_username = urllib.parse.unquote(form_data.username)
    user = db.query(User).filter(User.email == normalized_username).first()
    
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": normalized_username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
