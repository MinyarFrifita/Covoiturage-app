from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Email, To, Content, Mail
from app.database import Base, engine, get_db, User
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.trips import router as trips_router
from app.routes.trip_requests import router as trip_requests_router
from app.routes.notifications import router as notifications_router
from app.routes.feedback import router as feedback_router
from app.auth import create_access_token, get_current_user
from datetime import timedelta
import os
from dotenv import load_dotenv
import logging

# Charger les variables d'environnement
load_dotenv()

# Initialisation de l'application FastAPI
app = FastAPI()

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration de SendGrid
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
if not SENDGRID_API_KEY:
    logger.warning("SENDGRID_API_KEY not found in .env. Email sending will be disabled.")
SG_CLIENT = SendGridAPIClient(SENDGRID_API_KEY) if SENDGRID_API_KEY else None
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@covoiturage-app.com")
if not EMAIL_FROM.startswith("verified@") and SG_CLIENT:
    logger.warning(f"Email from {EMAIL_FROM} may not be verified with SendGrid. Ensure sender authentication is set up.")

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Ajuster pour la production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monter le répertoire des fichiers statiques
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialisation de la base de données
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise HTTPException(status_code=500, detail=f"Database initialization failed: {e}")

# Appeler init_db au démarrage
init_db()

# Inclusion des routeurs
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(trips_router)
app.include_router(trip_requests_router)
app.include_router(notifications_router)
app.include_router(feedback_router)

# Route racine
@app.get("/")
def read_root(current_user: dict = Depends(get_current_user)):
    return {"message": "Welcome to Covoiturage API", "user": current_user.get("email") if current_user else None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
