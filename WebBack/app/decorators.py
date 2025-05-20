# WebBack/app/decorators.py
from functools import wraps
from flask import request, g, jsonify, current_app  # Добавлен current_app
import jwt
from werkzeug.exceptions import Unauthorized, Forbidden

def get_current_user(token):
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],  # Исправлено
            algorithms=[current_app.config['JWT_ALGORITHM']]  # Исправлено
        )
        return {
            'userID': payload['userID'],
            'login': payload['login'],
            'user_role': payload['user_role'],
            'nickname': payload['nickname']
        }
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Token has expired")
    except jwt.InvalidTokenError:
        raise Unauthorized("Invalid token")
    except Exception as e:
        raise Unauthorized(f"Token verification failed: {str(e)}")

# Остальной код остается без изменений

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if request.method == 'OPTIONS':
                return jsonify({}), 200

            auth_header = request.headers.get('Authorization', '')
            token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
            
            if not token:
                raise Unauthorized("Authorization token is required")

            try:
                g.current_user = get_current_user(token)
            except Unauthorized as e:
                return jsonify({"error": e.description}), e.code

            if g.current_user['user_role'] not in roles:
                raise Forbidden(f"Required roles: {', '.join(roles)}")

            return f(*args, **kwargs)
        return wrapper
    return decorator

admin_required = role_required(['Administrator'])
moderator_required = role_required(['Administrator', 'Moderator'])