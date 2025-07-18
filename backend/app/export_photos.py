import os
import base64
import csv

with open('/tmp/trip_photos.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        trip_id = row['id']
        # Supprimer le préfixe \x et convertir la chaîne hexadécimale en bytes
        photo_data = bytes.fromhex(row['photo_path'].replace('\\x', ''))
        os.makedirs("uploads", exist_ok=True)  # Crée le dossier uploads s'il n'existe pas
        with open(f"uploads/trip_{trip_id}.png", "wb") as f:
            f.write(photo_data)
