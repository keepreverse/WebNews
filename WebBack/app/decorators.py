from functools import wraps
from flask import request, g, jsonify, current_app
import jwt
from app.exceptions import PermissionDeniedError, AuthError

def get_current_user(token):
    try:
        payload = jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=[current_app.config['JWT_ALGORITHM']]
        )
        return {
            'userID': payload['userID'],
            'login': payload['login'],
            'user_role': payload['user_role'],
            'nickname': payload['nickname']
        }
    except jwt.ExpiredSignatureError:
        raise AuthError("Токен истёк")
    except jwt.InvalidTokenError:
        raise AuthError("Неверный токен")
    except Exception as e:
        raise AuthError(f"Ошибка верификации токена: {str(e)}")

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if request.method == 'OPTIONS':
                return jsonify({}), 200

            auth_header = request.headers.get('Authorization', '')
            token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
            
            if not token:
                raise AuthError("Требуется токен авторизации")

            try:
                g.current_user = get_current_user(token)
            except AuthError as e:
                return jsonify({"error": e.message}), e.status_code

            if g.current_user['user_role'] not in roles:
                # Формируем сообщение на русском
                readable_roles = {
                    "Administrator": "администратора",
                    "Moderator": "модератора",
                    "Publisher": "публикатора"
                }
                required = [readable_roles.get(r, r) for r in roles]
                raise PermissionDeniedError(f"Доступ запрещён: требуется роль {' или '.join(required)}.")

            return f(*args, **kwargs)
        return wrapper
    return decorator

admin_required = role_required(['Administrator'])
moderator_required = role_required(['Administrator', 'Moderator'])
