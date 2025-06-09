from flask import Flask, g
from flask_cors import CORS
from database.db import Storage
import os
    
def create_app(config_object='config'):
    app = Flask(__name__)
    app.config.from_object(config_object)

    if not app.config.get('UPLOAD_FOLDER'):
        raise ValueError("UPLOAD_FOLDER должен быть задан")

    if hasattr(app.config, 'CORS_ORIGINS'):
        app.config['CORS_ORIGINS'] = app.config['CORS_ORIGINS']

    configure_cors(app)
    configure_uploads(app)
    configure_database(app)

    # Регистрация маршрутов
    from .routes import bp
    app.register_blueprint(bp)

    return app

def configure_cors(app):
    CORS(
        app,
        resources={r"/api/*": {
            "origins": app.config.get("CORS_ORIGINS", []),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }}
    )

def configure_uploads(app):
    upload_dir = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
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
                app.logger.error(f"Ошибка при закрытии БД: {str(e)}")
