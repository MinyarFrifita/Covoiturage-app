from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from ..auth import get_password_hash, verify_password, create_access_token, get_current_user
from ..database import get_db, User
from ..schemas import UserCreate, Token
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import os
import requests
import urllib.parse
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

async def verify_recaptcha(recaptcha_token: str):
    if not recaptcha_token:
        raise HTTPException(status_code=400, detail="reCAPTCHA token is required")
    recaptcha_secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not recaptcha_secret:
        raise HTTPException(status_code=500, detail="reCAPTCHA secret key not configured")
    response = requests.post(
        "https://www.google.com/recaptcha/api/siteverify",
        data={"secret": recaptcha_secret, "response": recaptcha_token}
    )
    result = response.json()
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=f"reCAPTCHA verification failed: {result.get('error-codes', [])}")
    return True

@router.post("/register", response_model=Token)
async def register(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    sexe: str = Form(...),
    recaptcha_token: str = Form(None),
    db: Session = Depends(get_db)
):
    if recaptcha_token:
        await verify_recaptcha(recaptcha_token)

    # Décoder l'email pour supprimer tout encodage (ex. %40 -> @)
    normalized_email = urllib.parse.unquote(email)
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hachage du mot de passe avant création
    hashed_password = get_password_hash(password)
    logger.info(f"Hashing password for email: {normalized_email}")

    # Création de l'utilisateur avec l'email normalisé
    new_user = User(
        email=normalized_email,
        password=hashed_password,
        role=role,
        sexe=sexe,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"User created with email: {normalized_email}, ID: {new_user.id}")

    access_token = create_access_token(data={"sub": normalized_email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    recaptcha_token: str = Form(None)
):
    if recaptcha_token:
        await verify_recaptcha(recaptcha_token)

    # Décoder l'email pour supprimer tout encodage
    normalized_username = urllib.parse.unquote(form_data.username)
    user = db.query(User).filter(User.email == normalized_username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )

    access_token = create_access_token(data={"sub": normalized_username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserCreate)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
