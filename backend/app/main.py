from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, get_db
from app.routes.auth import router as auth_router  
from app.routes.admin import router as admin_router  
from app.routes.trips import router as trips_router
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        raise
init_db()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])  # Ajout
app.include_router(trips_router, prefix="/trips", tags=["trips"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Covoiturage API"}
