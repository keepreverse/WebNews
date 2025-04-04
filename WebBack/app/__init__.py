from flask import Flask, g
from flask_cors import CORS
from database.db import Storage
import os

app = Flask(__name__)

# Настройка CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "http://localhost:3000",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 86400
    }
})

# Конфигурация
img_dir = os.path.join(os.getcwd(), 'img')
if not os.path.exists(img_dir):
    os.makedirs(img_dir)
app.config['UPLOAD_FOLDER'] = img_dir
app.config.from_object('config')

# Инициализация БД
def make_db_object():
    if 'db' not in g:
        g.db = Storage()
        g.db.open_connection()

@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop('db', None)
    if db is not None:
        try:
            db.close_connection()
        except:
            pass

from app import routes