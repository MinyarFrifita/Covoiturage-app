from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Email, To, Content, Mail
from .database import Base, engine, get_db, User
from .routes.auth import router as auth_router
from .routes.admin import router as admin_router
from .routes.trips import router as trips_router
from .routes.trip_requests import router as trip_requests_router
from .routes.notifications import router as notifications_router
from .routes.feedback import router as feedback_router
from .routes.users import router as users_router
from .auth import create_access_token, get_current_user
from datetime import timedelta
import os
from dotenv import load_dotenv
import logging
import mimetypes

load_dotenv()

app = FastAPI()

# Configuration des logs
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

# Configuration CORS améliorée
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://yourdomain.com"],  # Ajuster pour la production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "*"],  # Ajout de Authorization
    expose_headers=["Content-Disposition"],  # Pour les téléchargements de fichiers
)

# Initialisation de la base de données
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database initialization failed: {str(e)}")

init_db()

# Inclusion des routeurs
app.include_router(auth_router, tags=["auth"])
app.include_router(admin_router, tags=["admin"])
app.include_router(trips_router, tags=["trips"])
app.include_router(trip_requests_router, tags=["trip_requests"])
app.include_router(notifications_router, tags=["notifications"])
app.include_router(feedback_router, tags=["feedback"])
app.include_router(users_router, tags=["users"])

# Route racine
@app.get("/", response_model=dict)
def read_root(current_user: dict = Depends(get_current_user)):
    return {"message": "Welcome to Covoiturage API", "user": current_user.get("email") if current_user else None}

# Route pour servir les photos de manière sécurisée
BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(os.path.join(BASE_UPLOAD_DIR, "users"), exist_ok=True)

@app.get("/users/{user_id}/photo")
async def serve_user_photo(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user or not db_user.photo_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found or access denied")
    
    file_path = os.path.join(BASE_UPLOAD_DIR, db_user.photo_path)
    if not os.path.exists(file_path):
        logger.error(f"File not found at {file_path}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")
    
    # Déterminer le type MIME dynamiquement
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "application/octet-stream"  # Fallback générique

    try:
        return FileResponse(
            file_path,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",
                "Access-Control-Allow-Origin": "http://localhost:5173",
                "Access-Control-Allow-Credentials": "true",
            }
        )
    except Exception as e:
        logger.error(f"Error serving file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while serving file")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server on 0.0.0.0:8000 with reload enabled")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
