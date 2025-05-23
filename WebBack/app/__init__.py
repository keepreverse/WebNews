from flask import Flask, g
from flask_cors import CORS
from database.db import Storage
import os

def create_app(config_object='config'):
    app = Flask(__name__)
    app.config.from_object(config_object)

    if not app.config.get('UPLOAD_FOLDER'):
        raise ValueError("UPLOAD_FOLDER must be configured")
    
    configure_cors(app)
    configure_uploads(app)
    configure_database(app)
    
    from .routes import bp  # Изменено здесь
    app.register_blueprint(bp)
    
    return app

def configure_cors(app):
    CORS(
        app,
        resources={r"/api/*": app.config['CORS_OPTIONS']},
        supports_credentials=True
    )

def configure_uploads(app):
    # Создаем папку из конфига
    upload_dir = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    # Добавляем в конфиг абсолютный путь
    app.config['UPLOAD_FOLDER'] = os.path.abspath(upload_dir)

def configure_database(app):
    @app.before_request
    def connect_db():
        g.db = Storage()
        g.db.open_connection()

    @app.teardown_appcontext
    def disconnect_db(exception=None):
        db = g.pop('db', None)
        if db is not None:
            try:
                db.close_connection()
            except Exception as e:
                app.logger.error(f"Error closing DB: {str(e)}")