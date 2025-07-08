from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..auth import get_current_user
from ..database import get_db, User as UserModel, Trip as TripModel, Notification as NotificationModel
from ..schemas import NotificationCreate, Notification
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, PlainTextContent, HtmlContent
from dotenv import load_dotenv
import os
import logging
from datetime import datetime

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
if not SENDGRID_API_KEY:
    raise ValueError("SENDGRID_API_KEY must be set in .env")
SG_CLIENT = SendGridAPIClient(SENDGRID_API_KEY)

EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@covoiturage-app.com")
if not EMAIL_FROM.startswith("verified@"):
    logger.warning(f"Email from {EMAIL_FROM} may not be verified with SendGrid. Ensure sender authentication is set up.")

def send_notification_email(passenger_email: str, trip: TripModel = None, message: str = "") -> tuple[str, str]:
    if not passenger_email or '@' not in passenger_email:
        logger.error("Invalid passenger email: %s", passenger_email)
        return "failed", "Invalid passenger email"

    try:
        response = SG_CLIENT.client._ping.get()
        logger.info("SendGrid API key is valid, response: %s", response.status_code)
    except Exception as e:
        logger.error("SendGrid API key validation failed: %s", str(e))
        return "failed", "Invalid API key or permissions"

    subject = "New Notification from Driver"
    plain_content = f"""
Dear {passenger_email.split('@')[0]},

You have received a new message from your driver:
- Message: {message}
"""
    html_content = f"""
    <html>
    <body>
        <h3>Dear {passenger_email.split('@')[0]},</h3>
        <p>You have received a new message from your driver:</p>
        <ul>
            <li><strong>Message:</strong> {message}</li>
    """
    if trip:
        plain_content += f"""
- Trip: {trip.departure_city} to {trip.destination}
- Date and Time: {trip.date_time.strftime('%Y-%m-%d %H:%M')}
"""
        html_content += f"""
            <li><strong>Trip:</strong> {trip.departure_city} to {trip.destination}</li>
            <li><strong>Date and Time:</strong> {trip.date_time.strftime('%Y-%m-%d %H:%M')}</li>
        </ul>
        """
    else:
        plain_content += "\n- Note: This notification is not associated with a specific trip."
        html_content += """
            <li><strong>Note:</strong> This notification is not associated with a specific trip.</li>
        </ul>
        """

    plain_content += """
Best regards,
The Covoiturage Team
"""
    html_content += """
        <p>Best regards,<br>The Covoiturage Team</p>
    </body>
    </html>
    """

    mail = Mail(
        from_email=Email(EMAIL_FROM, "Covoiturage Team"),
        to_emails=To(passenger_email),
        subject=subject,
        plain_text_content=PlainTextContent(plain_content),
        html_content=HtmlContent(html_content)
    )
    try:
        response = SG_CLIENT.send(mail)
        logger.info("Email sent to %s, status: %s, response: %s", passenger_email, response.status_code, response.body)
        return "sent" if response.status_code == 202 else "failed", ""
    except Exception as e:
        error_msg = str(e) if str(e) else "Unknown error"
        logger.error("Failed to send email to %s: %s", passenger_email, error_msg)
        return "failed", error_msg

@router.post("/", response_model=dict)
def create_notification(
    notification: NotificationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info("Received notification data: %s, trip_id: %s", notification.dict(), notification.trip_id)
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can send notifications")

    passenger = db.query(UserModel).filter(UserModel.id == notification.passenger_id).first()
    if not passenger or not passenger.email:
        raise HTTPException(status_code=404, detail="Passenger not found or email missing")

    trip = None
    if notification.trip_id is not None:
        trip = db.query(TripModel).filter(TripModel.id == notification.trip_id).first()
        if not trip or trip.driver_id != current_user.id:
            raise HTTPException(status_code=404, detail="Trip not found or not owned by driver")

    new_notification = NotificationModel(
        passenger_id=notification.passenger_id,
        driver_id=current_user.id,
        trip_id=notification.trip_id,
        message=notification.message,
        is_read=False,
        created_at=datetime.utcnow(),
        email_status="pending" 
    )

    try:
        db.add(new_notification)
        db.commit()
        db.refresh(new_notification)
    except Exception as e:
        db.rollback()
        logger.error("Failed to create notification: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to create notification")

    logger.info("Notification created for passenger %s, trip %s, driver %s", 
                notification.passenger_id, notification.trip_id, current_user.id)

    email_status, error_detail = send_notification_email(passenger.email, trip, notification.message)
    logger.info("Email status for notification %s: %s, Detail: %s", new_notification.id, email_status, error_detail)

    try:
        new_notification.email_status = email_status
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to update email status: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to update email status")

    return {
        "message": "Notification created and email processed",
        "notification_id": new_notification.id,
        "email_status": email_status,
        "error_detail": error_detail if email_status == "failed" else None
    }

@router.get("/", response_model=list[Notification])
def get_notifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info("Fetching notifications for user: %s (role: %s)", current_user.email, current_user.role)
    if current_user.role == "admin":
        notifications = db.query(NotificationModel).all()
    else:
        notifications = db.query(NotificationModel).filter(
            (NotificationModel.driver_id == current_user.id) | 
            (NotificationModel.passenger_id == current_user.id)
        ).all()

    if not notifications:
        logger.info("No notifications found for user: %s", current_user.email)
        return []

    # Assurer la sérialisation correcte des relations
    return [Notification.from_orm(notification) for notification in notifications]
