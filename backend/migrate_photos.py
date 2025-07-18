import os
from sqlalchemy import create_engine, text
import re
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

engine = create_engine('postgresql://superuser:Pass123@localhost/covoiturage')
base_path = '/home/Minyar/covoiturage-app/backend/uploads/'

with engine.connect() as connection:
    # Vider et recréer la table pour éviter les doublons
    connection.execute(text("DROP TABLE IF EXISTS temp_trips"))
    connection.execute(text("CREATE TABLE temp_trips (id INT, photo_data BYTEA)"))
    logger.info("Table temp_trips recréée")

    for trip in connection.execute(text("SELECT id, photo_path FROM trips WHERE photo_path IS NOT NULL")):
        if isinstance(trip.photo_path, memoryview):
            photo_path = trip.photo_path.tobytes().decode('utf-8')
        else:
            photo_path = trip.photo_path.decode('utf-8') if isinstance(trip.photo_path, bytes) else trip.photo_path
        base_name = os.path.basename(photo_path)
        logger.info(f"Processing trip {trip.id}, base_name: {base_name}")
        matching_files = [f for f in os.listdir(base_path) if f.startswith(os.path.splitext(base_name)[0]) and f.endswith(os.path.splitext(base_name)[1])]
        logger.info(f"Matching files: {matching_files}")
        
        if matching_files:
            full_path = os.path.join(base_path, matching_files[0])
            if os.path.exists(full_path):
                with open(full_path, 'rb') as image_file:
                    binary_data = image_file.read()
                    logger.info(f"Read {len(binary_data)} bytes for trip {trip.id}, sample: {binary_data[:4].hex()}")
                    connection.execute(
                        text("INSERT INTO temp_trips (id, photo_data) VALUES (:id, :photo_data)"),
                        {"id": trip.id, "photo_data": binary_data}
                    )
            else:
                logger.warning(f"File {full_path} does not exist")
        else:
            logger.warning(f"No matching files found for {base_name}")

    inserted_count = connection.execute(text("SELECT COUNT(*) FROM temp_trips")).scalar()
    logger.info(f"Rows inserted into temp_trips: {inserted_count}")
    result = connection.execute(text("UPDATE trips t SET photo_path = tt.photo_data FROM temp_trips tt WHERE t.id = tt.id"))
    logger.info(f"Rows updated in trips: {result.rowcount}")

    # Tentative de suppression avec gestion d'erreur
    try:
        connection.execute(text("DROP TABLE temp_trips"))
        logger.info("Table temp_trips dropped")
    except Exception as e:
        logger.error(f"Failed to drop temp_trips: {str(e)}")

    logger.info("Migration completed")
