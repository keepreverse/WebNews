from http import HTTPStatus
import json
import os
from flask import Blueprint, jsonify, request, make_response, g, send_from_directory, current_app
from .decorators import admin_required, moderator_required
import jwt
import sqlite3
import logging
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.exceptions import BadRequest

from .exceptions import AppError, BusinessRuleError, ConstraintError, DatabaseError, FileValidationError, NotFoundError, ValidationError, AuthError, FileSystemError
bp = Blueprint('main', __name__)
logger = logging.getLogger(__name__)

@bp.errorhandler(AppError)
def handle_app_error(error: AppError):
    """Глобальный обработчик наших исключений"""
    if error.loggable:
        current_app.logger.error(f"{error.error_type}: {error.message}")
    return jsonify(error.to_dict()), error.status_code

@bp.errorhandler(Exception)
def handle_unexpected_error(error):
    """Глобальный catch-all для прочих ошибок — скрываем детали"""
    current_app.logger.exception("Непредвиденная ошибка:")
    return jsonify({"error": "Внутренняя ошибка сервера"}), HTTPStatus.INTERNAL_SERVER_ERROR

@bp.errorhandler(BadRequest)
def handle_bad_request(error):
    """Обработчик ошибок валидации запроса"""
    return jsonify({
        "error": "Невалидный запрос",
        "message": str(error),
        "type": "bad_request"
    }), HTTPStatus.BAD_REQUEST

@bp.route('/uploads/<filename>')
def upload_file(filename):
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    # Проверка существования файла
    if not os.path.exists(file_path) or 'placeholder' in filename:
        raise NotFoundError(resource_type="Файл", resource_id=filename)

    try:
        # Отправка файла с автоматическим статусом 200 OK
        response = make_response(send_from_directory(current_app.config['UPLOAD_FOLDER'], filename))
        response.headers['Cache-Control'] = 'public, max-age=604800'
        return response
    except IOError as e:
        raise FileSystemError(f"Ошибка чтения файла {filename}") from e

@bp.route("/api/news", methods=["GET", "POST", "DELETE", "OPTIONS"])
def news_line():
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    if request.method == "GET":
        news_list = [n for n in g.db.get_news() 
                   if n['status'] == 'Approved' and not n.get('delete_date')]
        return jsonify(news_list)

    elif request.method == "POST":
        # Валидация обязательных полей
        required_fields = ["login", "nickname", "title", "description", "event_start", "categoryID"]
        if not all(field in request.form for field in required_fields):
            raise ValidationError(
                "Отсутствуют обязательные поля", 
                details={"required_fields": required_fields}
            )

        primary_news_data = request.form
        login = primary_news_data.get("login")
        
        # Поиск пользователя
        user = g.db.user_get_by_login(login)
        if not user:
            raise AuthError("Неверные данные при авторизации")

        # Обработка файлов
        files_list = request.files.getlist('files') if 'files' in request.files else []
        
        # Валидация файлов
        MAX_FILE_SIZE = 5 * 1024 * 1024
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
        for file in files_list:
            if file.content_length > MAX_FILE_SIZE:
                raise FileValidationError(
                    f"Файл {file.filename} превышает лимит размера",
                    file_info={"filename": file.filename, "size": file.content_length}
                )
            if not ('.' in file.filename and 
                  file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
                raise FileValidationError(
                    f"Недопустимый формат файла: {file.filename}",
                    file_info={"filename": file.filename, "allowed": ALLOWED_EXTENSIONS}
                )

        # Добавление новости
        try:
            g.db.news_add(
                user[0],
                {**primary_news_data, "status": "Pending"},
                bool(files_list),
                files_list,
                current_app.config['UPLOAD_FOLDER']
            )
        except FileNotFoundError as e:
            raise FileSystemError("Система хранения файлов недоступна") from e
        except sqlite3.OperationalError as e:
            raise DatabaseError("Ошибка записи в базу данных") from e

        return jsonify({"message": "Новость успешно добавлена"}), HTTPStatus.OK

    elif request.method == "DELETE":
        news_ids = [row[0] for row in g.db.cursor.execute('''
            SELECT newsID FROM News WHERE delete_date IS NULL
        ''')]
        
        if news_ids:
            g.db.news_soft_delete_multiple(news_ids)
        
        return jsonify({
            "message": "Все новости удалены",
            "count": len(news_ids)
        })

@bp.route("/api/news/<int:newsID>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
def single_news(newsID):
    if request.method == "OPTIONS":
        return jsonify({})

    # Общая проверка существования новости для всех методов
    news_data = g.db.get_news_single(newsID)
    if not news_data[0]:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)

    if request.method == "GET":
        return jsonify(news_data[0])

    elif request.method == "PUT":
        # Валидация обязательных полей
        required_fields = ["login", "nickname", "title", "description", "event_start", "categoryID"]
        if not all(field in request.form for field in required_fields):
            raise ValidationError(
                "Отсутствуют обязательные поля", 
                details={"required_fields": required_fields}
            )

        primary_news_data = request.form
        user = g.db.user_get_by_login(primary_news_data.get("login"))
        if not user:
            raise AuthError("Неверные данные при авторизации")

        # Валидация файлов
        files_list = request.files.getlist('files') if 'files' in request.files else []
        MAX_FILE_SIZE = 5 * 1024 * 1024
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

        for file in files_list:
            # Проверка размера файла
            if file.content_length > MAX_FILE_SIZE:
                raise FileValidationError(
                    f"Файл {file.filename} превышает лимит размера",
                    file_info={"filename": file.filename, "size": file.content_length}
                )

            # Проверка расширения файла
            if '.' not in file.filename:
                raise FileValidationError(
                    "Файл не имеет расширения",
                    file_info={"filename": file.filename}
                )

            extension = file.filename.rsplit('.', 1)[1].lower()
            if extension not in ALLOWED_EXTENSIONS:
                raise FileValidationError(
                    f"Недопустимый формат файла: {file.filename}",
                    file_info={
                        "filename": file.filename, 
                        "allowed": ALLOWED_EXTENSIONS,
                        "actual": extension
                    }
                )

        # Обновление новости
        try:
            g.db.news_update(
                newsID,
                user[0],
                primary_news_data,
                bool(files_list),
                files_list,
                current_app.config['UPLOAD_FOLDER'],
                request.form.getlist('existing_files'),
                status_override='Approved'  # <- Добавляем смену статуса
            )
        except sqlite3.OperationalError as e:
            raise DatabaseError("Ошибка обновления записи") from e
        except FileNotFoundError as e:
            raise FileSystemError("Ошибка файловой системы") from e

        return jsonify({"message": "Новость успешно обновлена и одобрена"}), HTTPStatus.OK

    elif request.method == "DELETE":
        try:
            g.db.news_soft_delete(newsID)
            return jsonify({
                "message": f"Новость {newsID} перемещена в корзину",
                "newsID": newsID
            }), HTTPStatus.OK
        except sqlite3.OperationalError as e:
            raise DatabaseError("Ошибка удаления новости") from e


@bp.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    import unicodedata

    data = request.get_json()
    login = data.get("login", "").strip()
    password = data.get("password", "").strip()

    if not login or not password:
        raise ValidationError("Логин и пароль обязательны")

    # Нормализуем логин пользователя
    norm_login = unicodedata.normalize("NFKC", login).casefold()

    matched_user = None
    for user in g.db.user_get_all():
        db_login = unicodedata.normalize("NFKC", user["login"]).casefold()
        if norm_login == db_login:
            matched_user = g.db.user_get_by_id(user["userID"])  # <-- получаем пользователя с паролем
            break

    if not matched_user or not check_password_hash(matched_user["password"], password):
        raise AuthError("Неверный логин или пароль")

    try:
        token_payload = {
            "userID": matched_user["userID"],
            "login": matched_user["login"],
            "user_role": matched_user["user_role"],
            "nickname": matched_user["nick"],
            "exp": datetime.utcnow() + current_app.config["JWT_EXPIRATION_DELTA"]
        }
        token = jwt.encode(
            token_payload,
            current_app.config["JWT_SECRET_KEY"],
            algorithm=current_app.config["JWT_ALGORITHM"]
        )
    except jwt.PyJWTError as e:
        raise AppError("Ошибка генерации токена", loggable=False) from e

    return jsonify({
        "token": token,
        "userID": matched_user["userID"],
        "user_role": matched_user["user_role"],
        "nickname": matched_user["nick"],
        "login": matched_user["login"]
    })


@bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    login = data.get("login", "").strip()
    password = data.get("password", "").strip()
    nickname = data.get("nickname", "").strip()

    # Валидация полей
    if not all([login, password, nickname]):
        raise ValidationError(
            "Все поля обязательны для заполнения: логин, пароль, никнейм",
            details={"required_fields": ["login", "password", "nickname"]}
        )

    if len(password) < 6:
        raise ValidationError(
            "Слабый пароль", 
            details={"requirement": "Минимум 6 символов"}
        )

    # Проверка уникальности логина и ника с Unicode-нормализацией
    import unicodedata
    norm_login = unicodedata.normalize("NFKC", login).casefold()
    norm_nick = unicodedata.normalize("NFKC", nickname).casefold()

    all_users = g.db.user_get_all()
    for user in all_users:
        existing_login = unicodedata.normalize("NFKC", user["login"]).casefold()
        existing_nick = unicodedata.normalize("NFKC", user["nick"]).casefold()
        if existing_login == norm_login:
            raise ConstraintError("Логин уже используется", constraint="unique_login")
        if existing_nick == norm_nick:
            raise ConstraintError("Никнейм уже используется", constraint="unique_nick")

    try:
        user_id = g.db.user_create(login, password, nickname)

    except ValueError as e:
        error_message = str(e)
        if "логин" in error_message:
            raise ConstraintError(error_message, constraint="unique_login") from e
        if "никнейм" in error_message:
            raise ConstraintError(error_message, constraint="unique_nickname") from e
        raise ConstraintError(error_message) from e

    return jsonify({
        "message": "Пользователь успешно зарегистрирован",
        "userID": user_id
    }), HTTPStatus.OK

@bp.route("/api/auth/logout", methods=["POST", "OPTIONS"])
def logout():
    """Выход пользователя из системы"""
    if request.method == "OPTIONS":
        return jsonify({})

    # Создаем базовый ответ
    response = jsonify({
        "status": "success",
        "message": "Сессия успешно завершена"
    })
    
    # Удаляем куку аутентификации
    response.delete_cookie(
        key="session",
        path="/",
        domain=None,
        secure=True,
        httponly=True,
        samesite="Lax"
    )
    
    return response

@bp.route("/api/admin/users", methods=["GET"])
@moderator_required
def admin_users():
    try:
        users = g.db.user_get_all()
        return jsonify(users)
    
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Не удалось получить данные пользователей", 
            details={"operation": "user_get_all"}
        ) from e

@bp.route("/api/admin/users/real_passwords", methods=["GET"])
@admin_required
def admin_users_real_passwords():
    try:
        users = g.db.user_get_all_with_real_passwords()
        return jsonify(users)
    
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка получения паролей пользователей",
            details={
                "operation": "user_get_all_with_real_passwords",
                "error_code": "DB_READ_FAILURE"
            }
        ) from e

@bp.route("/api/admin/pending-news", methods=["GET"])
@moderator_required
def pending_news():
    """
    Возвращает список всех новостей со статусом 'Pending' и delete_date IS NULL.
    """
    try:
        # Вызываем новый метод из Storage
        pending_list = g.db.get_pending_news()
        return jsonify(pending_list), HTTPStatus.OK

    except DatabaseError as e:
        # Перебрасываем нашу кастомную ошибку (обработается глобально)
        raise e

@bp.route("/api/admin/moderate-news/<int:newsID>", methods=["POST", "OPTIONS"])
@moderator_required
def moderate_news(newsID):
    """Модерация новости (одобрение/отклонение)"""
    if request.method == "OPTIONS":
        return jsonify({})

    try:
        # Валидация входных данных
        data = request.get_json(silent=True) or {}
        action = data.get("action")

        if not data:
            raise ValidationError("Необходимо указать данные запроса")
            
        if not action:
            raise ValidationError("Отсутствует обязательное поле 'action'")

        if action not in ["approve", "reject"]:
            raise ValidationError(
                "Недопустимое действие",
                details={"allowed_actions": ["approve", "reject"]}
            )

        # Получение и проверка новости
        news_data = g.db.get_news_single(newsID)
        if not news_data or not news_data[0]:
            raise NotFoundError(resource_type="Новость", resource_id=newsID)

        current_status = news_data[0]['status']
        if current_status != "Pending":
            raise BusinessRuleError(
                "Новость уже была промодерирована",
                error_code="ALREADY_MODERATED"
            )

        # Обновление статуса
        new_status = "Approved" if action == "approve" else "Rejected"
        moderator_id = g.current_user['userID']

        try:
            # Обновляем статус новости
            g.db.cursor.execute('''
                UPDATE News
                SET status = ?, moderated_byID = ?
                WHERE newsID = ?
            ''', (new_status, moderator_id, newsID))
            
            # Для отклонения - мягкое удаление
            if action == "reject":
                # Используем прямое обновление вместо news_soft_delete
                g.db.cursor.execute('''
                    UPDATE News
                    SET delete_date = datetime('now', 'localtime')
                    WHERE newsID = ?
                ''', (newsID,))
                
            g.db.connection.commit()

        except sqlite3.OperationalError as e:
            raise DatabaseError(
                "Ошибка обновления статуса новости",
                details={
                    "operation": "news_moderation",
                    "news_id": newsID,
                    "new_status": new_status
                }
            ) from e

        return jsonify({
            "message": f"Новость успешно {'одобрена' if action == 'approve' else 'отклонена'}",
            "newsID": newsID,
            "newStatus": new_status
        }), HTTPStatus.OK

    except json.JSONDecodeError:
        raise ValidationError("Невалидный JSON в теле запроса")

    except KeyError as e:
        raise DatabaseError(
            "Ошибка структуры данных новости",
            details={"missing_field": str(e)}
        )
    
@bp.route("/api/news/<int:newsID>/archive", methods=["POST", "OPTIONS"])
def archive_news(newsID):
    if request.method == "OPTIONS":
        return jsonify({})

    try:
        # Проверяем существование новости
        news_data = g.db.get_news_single(newsID)
        if not news_data or not news_data[0]:
            raise NotFoundError(resource_type="Новость", resource_id=newsID)

        # Проверяем текущий статус новости
        current_status = news_data[0]['status']
        if current_status == 'Archived':
            raise BusinessRuleError(
                "Новость уже находится в архиве",
                error_code="ALREADY_ARCHIVED"
            )

        # Выполняем обновление статуса
        g.db.cursor.execute('''
            UPDATE News
            SET status = 'Archived'
            WHERE newsID = ?
        ''', (newsID,))
        
        g.db.connection.commit()
        
        return jsonify({
            "message": "Новость успешно перемещена в архив"
        }), HTTPStatus.OK

    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка при архивации новости",
            details={
                "operation": "archive_news",
                "news_id": newsID
            }
        ) from e

@bp.route("/api/admin/users/<int:user_id>", methods=["PUT", "DELETE"])
@admin_required
def admin_user_operations(user_id):
    try:
        # Проверка существования пользователя
        user = g.db.user_get_by_id(user_id)
        if not user:
            raise NotFoundError(resource_type="Пользователь", resource_id=user_id)

        if request.method == "PUT":
            return handle_user_update(user_id)
            
        elif request.method == "DELETE":
            return handle_user_deletion(user_id)

    except json.JSONDecodeError:
        raise ValidationError("Невалидный JSON в теле запроса")

def handle_user_update(user_id):
    """Обработка обновления пользователя"""
    update_data = request.get_json()
    if not update_data:
        raise ValidationError("Отсутствуют данные для обновления")
    
    if any(value.strip() == "" for value in update_data.values()):
        raise ValidationError("Поля не могут быть пустыми")

    # Фильтрация полей
    allowed_fields = ["nick", "login", "user_role"]
    filtered_data = {
        k: v for k, v in update_data.items() 
        if k in allowed_fields and v is not None
    }
    
    if not filtered_data:
        raise ValidationError(
            "Нет допустимых полей для обновления",
            details={"allowed_fields": allowed_fields}
        )
    
    # Проверка уникальности логина/ника без учёта регистра (исключая текущего пользователя)
    if 'login' in filtered_data or 'nick' in filtered_data:
        current_user = g.db.user_get_by_id(user_id)
        current_login = current_user['login']
        current_nick = current_user['nick']

        new_login = filtered_data.get('login', current_login)
        new_nick = filtered_data.get('nick', current_nick)

        import unicodedata
        norm_new_login = unicodedata.normalize("NFKC", new_login).casefold()
        norm_new_nick = unicodedata.normalize("NFKC", new_nick).casefold()

        all_users = g.db.user_get_all()
        for user in all_users:
            if user['userID'] == user_id:
                continue
            other_login = unicodedata.normalize("NFKC", user['login']).casefold()
            other_nick = unicodedata.normalize("NFKC", user['nick']).casefold()
            if norm_new_login == other_login:
                raise ConstraintError(
                    "Пользователь с таким логином уже существует",
                    constraint="unique_login"
                )
            if norm_new_nick == other_nick:
                raise ConstraintError(
                    "Пользователь с таким никнеймом уже существует",
                    constraint="unique_nick"
                )

    # Обновление пользователя
    try:
        g.db.user_update(user_id, filtered_data)
        return jsonify({
            "message": "Пользователь успешно обновлен",
            "userID": user_id
        }), HTTPStatus.OK
        
    except sqlite3.IntegrityError as e:
        raise ConstraintError(
            "Нарушение целостности данных при обновлении",
            constraint=str(e)
        )

def handle_user_deletion(user_id):
    """Обработка удаления пользователя"""
    if g.current_user['userID'] == user_id:
        raise BusinessRuleError(
            "Нельзя удалить самого себя",
            error_code="SELF_DELETION"
        )
    
    try:
        g.db.user_delete(user_id)
        return jsonify({
            "message": "Пользователь успешно удален",
            "userID": user_id
        }), HTTPStatus.OK
        
    except sqlite3.IntegrityError as e:
        raise ConstraintError(
            "Невозможно удалить пользователя из-за связанных данных",
            constraint=str(e),
            status_code=HTTPStatus.CONFLICT
        )

@bp.route("/api/admin/users/all", methods=["DELETE"])
@admin_required
def delete_all_users():
    try:
        current_user_id = g.current_user['userID']
        # Получаем всех пользователей ДО удаления
        initial_users = g.db.user_get_all()
        
        # Проверяем, есть ли другие пользователи кроме текущего
        other_users = [u for u in initial_users if u['userID'] != current_user_id]
        
        if not other_users:
            raise BusinessRuleError(
                "Нет других пользователей для удаления",
                error_code="NO_USERS_TO_DELETE"
            )
        
        # Выполняем удаление
        g.db.users_delete_all(exclude_ids=[current_user_id])
        
        # Получаем пользователей ПОСЛЕ удаления
        remaining_users = g.db.user_get_all()
        
        return jsonify({
            "message": "Пользователи успешно удалены",
            "remainingUsers": remaining_users,
            "deletedCount": len(other_users)
        }), HTTPStatus.OK
        
    except BusinessRuleError as e:
        raise e  # Пробрасываем нашу кастомную ошибку

@bp.route("/api/categories", methods=["GET", "POST", "DELETE", "OPTIONS"])
def categories():
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    if request.method == "GET":
        return jsonify(g.db.category_get_all()), HTTPStatus.OK

    if request.method == "POST":
        data = request.get_json()
        name = data.get("name", "").strip()
        description = data.get("description")

        if not name:
            raise ValidationError("Название категории обязательно")

        # Проверка на дубликат с нормализацией
        import unicodedata
        normalized_name = unicodedata.normalize("NFKC", name).casefold()

        for cat in g.db.category_get_all():
            existing_name = unicodedata.normalize("NFKC", cat["name"]).casefold()
            if normalized_name == existing_name:
                raise ConstraintError("Категория с таким названием уже существует", constraint="unique_name")

        category_id = g.db.category_create(name=name, description=description)
        return jsonify({
            "message": "Категория создана",
            "categoryID": category_id
        }), HTTPStatus.OK

    if request.method == "DELETE":
        category_id = request.args.get("id")
        if not category_id:
            raise ValidationError("ID категории обязательно")

        g.db.category_delete(category_id)
        return jsonify({"message": "Категория удалена"}), HTTPStatus.OK

@bp.route("/api/categories/all", methods=["DELETE", "OPTIONS"])
@moderator_required
def delete_all_categories():
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK
    
    try:
        # Выполняем удаление всех категорий
        g.db.cursor.execute("DELETE FROM Categories")
        g.db.connection.commit()
        
        return jsonify({
            "message": "Все категории успешно удалены"
        }), HTTPStatus.OK
        
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка удаления категорий",
            details={"operation": "delete_all_categories"}
        ) from e

@bp.route("/api/categories/<int:category_id>", methods=["PUT", "OPTIONS"])
@moderator_required
def update_category(category_id):
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    data = request.get_json()
    name = data.get("name", "").strip()
    description = data.get("description")

    if not name:
        raise ValidationError("Название категории обязательно")

    # Проверка дубликатов с Unicode-нормализацией
    import unicodedata
    normalized_name = unicodedata.normalize("NFKC", name).casefold()

    for cat in g.db.category_get_all():
        if cat["categoryID"] != category_id:
            existing_name = unicodedata.normalize("NFKC", cat["name"]).casefold()
            if normalized_name == existing_name:
                raise ConstraintError("Категория с таким названием уже существует", constraint="unique_name")

    # Обновление
    g.db.category_update(category_id, name=name, description=description)

    return jsonify({"message": "Категория успешно обновлена"}), HTTPStatus.OK

@bp.route("/api/admin/trash", methods=["GET"])
@moderator_required
def get_trash():
    try:
        # Получаем удаленные новости
        deleted_news = g.db.get_deleted_news()
        
        # Фильтруем только новости с датой удаления
        news_list = [n for n in deleted_news if n.get('delete_date')]
        
        return jsonify(news_list), HTTPStatus.OK
        
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка получения данных корзины",
            details={"operation": "get_deleted_news"}
        ) from e

@bp.route("/api/admin/trash/<int:newsID>/purge", methods=["DELETE"])
@moderator_required
def purge_single_news(newsID):
    # Проверяем существование новости в корзине
    news_data = g.db.get_deleted_news_single(newsID)
    if not news_data:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)
    
    # Проверяем, находится ли новость в корзине
    if not news_data.get('delete_date'):
        raise BusinessRuleError(
            "Новость не находится в корзине",
            error_code="NOT_IN_TRASH"
        )
    
    try:
        # Окончательное удаление новости
        g.db.purge_news([newsID])
        return jsonify({
            "message": "Новость окончательно удалена"
        }), HTTPStatus.OK
        
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка удаления новости",
            details={
                "operation": "purge_single_news",
                "news_id": newsID
            }
        ) from e

@bp.route("/api/admin/trash/purge", methods=["DELETE"])
@moderator_required
def purge_trash():
    try:
        # Получаем все ID в корзине
        g.db.cursor.execute('''
            SELECT newsID FROM News WHERE delete_date IS NOT NULL
        ''')
        news_ids = [row[0] for row in g.db.cursor.fetchall()]
        
        if news_ids:
            g.db.purge_news(news_ids)
        
        return jsonify({
            "message": "Корзина очищена",
            "count": len(news_ids)
        }), HTTPStatus.OK
        
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка очистки корзины",
            details={"operation": "purge_trash"}
        ) from e

@bp.route("/api/admin/trash/check-expired", methods=["POST"])
@moderator_required
def check_expired():
    try:
        # Вызываем метод для удаления просроченных новостей
        purged_count = g.db.purge_expired_news()
        
        return jsonify({
            "message": "Просроченные новости удалены",
            "count": purged_count
        }), HTTPStatus.OK
        
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка при очистке просроченных новостей",
            details={"operation": "purge_expired_news"}
        ) from e

@bp.route("/api/admin/trash/<int:newsID>/restore", methods=["POST"])
@moderator_required
def restore_news(newsID):
    # Проверяем существование новости
    news_data = g.db.get_deleted_news_single(newsID)
    if not news_data:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)
    
    # Проверяем, находится ли новость в корзине
    if not news_data.get('delete_date'):
        raise BusinessRuleError(
            "Новость не находится в корзине",
            error_code="NOT_IN_TRASH"
        )
    
    try:
        # Восстанавливаем новость
        g.db.cursor.execute('''
            UPDATE News
            SET delete_date = NULL,
                status = 'Approved'
            WHERE newsID = ?
        ''', (newsID,))
        g.db.connection.commit()
        
        return jsonify({
            "message": "Новость успешно восстановлена"
        }), HTTPStatus.OK
        
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка восстановления новости",
            details={
                "operation": "restore_news",
                "news_id": newsID
            }
        ) from e

@bp.route("/api/admin/trash/<int:newsID>/restore-edit", methods=["POST"])
@moderator_required
def restore_edit_news(newsID):
    # Проверяем существование новости
    news_data = g.db.get_deleted_news_single(newsID)
    if not news_data:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)
    
    # Проверяем, находится ли новость в корзине
    if not news_data.get('delete_date'):
        raise BusinessRuleError(
            "Новость не находится в корзине",
            error_code="NOT_IN_TRASH"
        )
    
    try:
        # Восстанавливаем новость
        g.db.cursor.execute('''
            UPDATE News
            SET delete_date = NULL,
                status = 'Pending'
            WHERE newsID = ?
        ''', (newsID,))
        g.db.connection.commit()
        
        return jsonify({
            "message": "Новость подготовлена к восстановлению"
        }), HTTPStatus.OK
        
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка восстановления новости",
            details={
                "operation": "restore_news",
                "news_id": newsID
            }
        ) from e