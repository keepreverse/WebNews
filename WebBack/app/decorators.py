# WebBack/app/decorators.py
from functools import wraps
from flask import request, make_response, jsonify, g
import jwt
from app import app

def role_required(roles):
    """Декоратор для проверки ролей пользователя"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Пропускаем OPTIONS запросы для CORS
            if request.method == 'OPTIONS':
                return make_response(jsonify({}), 200)

            # Извлекаем токен из заголовка
            token = None
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split()[1]

            if not token:
                return make_response(jsonify({
                    "error": "Authorization token is required"
                }), 401)

            try:
                # Декодируем токен
                payload = jwt.decode(
                    token,
                    app.config['JWT_SECRET_KEY'],
                    algorithms=[app.config['JWT_ALGORITHM']]
                )
                g.current_user = {
                    'userID': payload['userID'],
                    'login': payload['login'],
                    'user_role': payload['user_role'],
                    'nickname': payload['nickname']
                }

            except jwt.ExpiredSignatureError:
                return make_response(jsonify({
                    "error": "Token has expired"
                }), 401)
            except jwt.InvalidTokenError:
                return make_response(jsonify({
                    "error": "Invalid token"
                }), 401)
            except Exception as e:
                return make_response(jsonify({
                    "error": f"Token verification failed: {str(e)}"
                }), 401)

            # Проверяем наличие требуемой роли
            if payload['user_role'] not in roles:
                return make_response(jsonify({
                    "error": f"Access denied. Required roles: {', '.join(roles)}"
                }), 403)

            return f(*args, **kwargs)
        return wrapper
    return decorator

# Создаем конкретные декораторы
admin_required = role_required(['Administrator'])
moderator_required = role_required(['Administrator', 'Moderator'])