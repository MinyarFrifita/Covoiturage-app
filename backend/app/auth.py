from .database import User, get_db
import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from sqlalchemy.orm import Session
import requests
import logging
import urllib.parse

load_dotenv()

# Configuration des paramètres de sécurité
SECRET_KEY = os.getenv("SECRET_KEY", "4e9f8d7c6b5a4e9f8d7c6b5a4e9f8d7c6b5a4e9f8d7c6b5a4e9f8d7c6b5a4e9f")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Initialisation du contexte de hachage des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuration de l'authentification OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Fonctions de hachage et vérification
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Création de token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Récupération de l'utilisateur
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logging.error(f"Payload missing 'sub': {payload}")
            raise credentials_exception
        # Normaliser l'email avec unquote pour gérer tous les encodages
        normalized_email = urllib.parse.unquote(email)
        logging.info(f"Decoded email from token: {normalized_email}")
    except JWTError as e:
        logging.error(f"JWT Error: {str(e)}")
        raise credentials_exception

    # Tenter de trouver l'utilisateur avec les deux formats (normalisé et encodé)
    for email_variant in [normalized_email, urllib.parse.quote(normalized_email)]:
        user = db.query(User).filter(User.email == email_variant).first()
        if user:
            logging.info(f"User found with email: {email_variant}")
            return user
    logging.warning(f"User not found for email variants: {normalized_email}, {urllib.parse.quote(normalized_email)}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"User not found for email: {normalized_email}",
        headers={"WWW-Authenticate": "Bearer"},
    )

# reCAPTCHA
async def verify_recaptcha(token: str):
    if not token:
        raise HTTPException(status_code=400, detail="reCAPTCHA token is required")
    recaptcha_secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not recaptcha_secret:
        raise HTTPException(status_code=500, detail="reCAPTCHA secret key not configured")
    response = requests.post(
        "https://www.google.com/recaptcha/api/siteverify",
        data={"secret": recaptcha_secret, "response": token}
    )
    result = response.json()
    if not result.get("success"):
        raise HTTPException(status_code=400, detail="reCAPTCHA verification failed")
    return True
