import os
from datetime import timedelta

# Абсолютный путь к директории проекта
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "database", "storage.db")

# Папка для загрузок
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

# Разрешённые домены для CORS
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://keepreverse.github.io"  # GitHub Pages frontend
]

# JWT настройки
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = timedelta(hours=24)
