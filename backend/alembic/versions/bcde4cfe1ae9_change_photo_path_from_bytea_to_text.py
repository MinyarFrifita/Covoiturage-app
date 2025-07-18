"""Change photo_path from bytea to text

Revision ID: 1234567890ab
Revises: 
Create Date: 2025-07-11 20:30:00.000000
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Ajouter une nouvelle colonne temporaire de type text
    op.add_column('trips', sa.Column('photo_path_temp', sa.Text(), nullable=True))
    # Copier les données binaires décodées en texte (si elles représentent un chemin encodé)
    op.execute("UPDATE trips SET photo_path_temp = decode(photo_path, 'hex')::text WHERE photo_path IS NOT NULL")
    # Supprimer l'ancienne colonne
    op.drop_column('trips', 'photo_path')
    # Renommer la colonne temporaire en photo_path
    op.alter_column('trips', 'photo_path_temp', new_column_name='photo_path')

def downgrade():
    # Ajouter une nouvelle colonne temporaire de type bytea
    op.add_column('trips', sa.Column('photo_path_temp', sa.LargeBinary(), nullable=True))
    # Copier les données texte encodées en binaire (attention : perte potentielle si données invalides)
    op.execute("UPDATE trips SET photo_path_temp = decode(photo_path, 'hex') WHERE photo_path IS NOT NULL")
    # Supprimer l'ancienne colonne
    op.drop_column('trips', 'photo_path')
    # Renommer la colonne temporaire en photo_path
    op.alter_column('trips', 'photo_path_temp', new_column_name='photo_path')
