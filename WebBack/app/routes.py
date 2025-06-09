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

from .exceptions import (
    AppError, BusinessRuleError, ConstraintError,
    DatabaseError, FileValidationError, NotFoundError,
    ValidationError, AuthError, FileSystemError
)

bp = Blueprint('main', __name__)
logger = logging.getLogger(__name__)


# ===========================
#  Глобальные обработчики
# ===========================

@bp.errorhandler(AppError)
def handle_app_error(error: AppError):
    """Глобальный обработчик наших исключений AppError."""
    if error.loggable:
        current_app.logger.error(f"{error.error_type}: {error.message}")
    return jsonify(error.to_dict()), error.status_code


@bp.errorhandler(Exception)
def handle_unexpected_error(error):
    """Catch-all для остальных ошибок (скрываем детали)."""
    current_app.logger.exception("Непредвиденная ошибка:")
    return jsonify({"error": "Внутренняя ошибка сервера"}), HTTPStatus.INTERNAL_SERVER_ERROR


@bp.errorhandler(BadRequest)
def handle_bad_request(error):
    """Ошибки валидации запроса (400)."""
    return jsonify({
        "error": "Невалидный запрос",
        "message": str(error),
        "type": "bad_request"
    }), HTTPStatus.BAD_REQUEST


# ===========================
#   Простейший health check
# ===========================

@bp.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok"}), HTTPStatus.OK


# ===========================
#   Статика для загруженных файлов
# ===========================

@bp.route('/uploads/<filename>')
def upload_file(filename):
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path) or 'placeholder' in filename:
        raise NotFoundError(resource_type="Файл", resource_id=filename)

    try:
        response = make_response(send_from_directory(current_app.config['UPLOAD_FOLDER'], filename))
        response.headers['Cache-Control'] = 'public, max-age=604800'
        return response
    except IOError as e:
        raise FileSystemError(f"Ошибка чтения файла {filename}") from e

# ===========================
#     News: list / create / delete all
# ===========================

@bp.route("/api/news", methods=["GET", "POST", "DELETE", "OPTIONS"])
def news_line():
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    # GET: вернуть все «утверждённые» и не удалённые новости
    if request.method == "GET":
        news_list = [
            n for n in g.db.get_news()
            if n['status'] == 'Approved' and not n.get('delete_date')
        ]
        return jsonify(news_list)

    # POST: создать новую новость (Pending)
    elif request.method == "POST":
        required_fields = [
            "login", "nickname", "title", "description",
            "event_start", "event_end", "categoryID"
        ]
        if not all(field in request.form for field in required_fields):
            raise ValidationError(
                "Отсутствуют обязательные поля",
                details={"required_fields": required_fields}
            )

        primary_news_data = request.form
        login = primary_news_data.get("login")
        user = g.db.user_get_by_login(login)
        if not user:
            raise AuthError("Неверные данные при авторизации")

        files_list = request.files.getlist('files') if 'files' in request.files else []
        MAX_FILE_SIZE = 5 * 1024 * 1024
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

        for file in files_list:
            if file.content_length > MAX_FILE_SIZE:
                raise FileValidationError(
                    f"Файл {file.filename} превышает лимит размера",
                    file_info={"filename": file.filename, "size": file.content_length}
                )
            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
                raise FileValidationError(
                    f"Недопустимый формат файла: {file.filename}",
                    file_info={"filename": file.filename, "allowed": ALLOWED_EXTENSIONS}
                )

        try:
            # --- Преобразуем categoryID: пустая строка или "null" → None, иначе int ---
            raw_cat = primary_news_data.get("categoryID")
            if raw_cat is None or raw_cat == "" or raw_cat.lower() == "null":
                primary_processed = {
                    **primary_news_data,
                    "categoryID": None,
                    "status": "Pending"
                }
            else:
                try:
                    primary_processed = {
                        **primary_news_data,
                        "categoryID": int(raw_cat),
                        "status": "Pending"
                    }
                except ValueError:
                    raise ValidationError("Неверный формат categoryID")

            g.db.news_add(
                user[0],
                primary_processed,
                bool(files_list),
                files_list,
                current_app.config['UPLOAD_FOLDER']
            )
        except FileNotFoundError as e:
            raise FileSystemError("Система хранения файлов недоступна") from e
        except sqlite3.OperationalError as e:
            raise DatabaseError("Ошибка записи в базу данных") from e

        return jsonify({"message": "Новость успешно добавлена"}), HTTPStatus.OK

    # DELETE: массово «пометить все как удалённые»
    elif request.method == "DELETE":
        @moderator_required
        def delete_news_all():
            news_ids = [row[0] for row in g.db.cursor.execute('''
                SELECT newsID FROM News WHERE delete_date IS NULL
            ''')]
            if news_ids:
                g.db.news_soft_delete_multiple(news_ids)

            return jsonify({
                "message": "Все новости помечены как удалённые",
                "count": len(news_ids)
            }), HTTPStatus.OK
        return delete_news_all()


# ===========================
#  News: single GET / PUT / DELETE
# ===========================

@bp.route("/api/news/<int:newsID>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@moderator_required
def single_news(newsID):
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    # Получаем данные (если удалена → 404)
    news_data = g.db.get_news_single(newsID)
    if not news_data[0]:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)

    # GET: возвращаем JSON с одной новостью
    if request.method == "GET":
        return jsonify(news_data[0])

    # PUT: обновление + (approve → статус Approved)
    elif request.method == "PUT":
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

        files_list = request.files.getlist('files') if 'files' in request.files else []
        MAX_FILE_SIZE = 5 * 1024 * 1024
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

        for file in files_list:
            if file.content_length > MAX_FILE_SIZE:
                raise FileValidationError(
                    f"Файл {file.filename} превышает лимит размера",
                    file_info={"filename": file.filename, "size": file.content_length}
                )
            if '.' not in file.filename:
                raise FileValidationError(
                    "Файл не имеет расширения",
                    file_info={"filename": file.filename}
                )
            ext = file.filename.rsplit('.', 1)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise FileValidationError(
                    f"Недопустимый формат файла: {file.filename}",
                    file_info={"filename": file.filename, "allowed": ALLOWED_EXTENSIONS, "actual": ext}
                )

        # --- Преобразуем categoryID: пустая строка или "null" → None, иначе int ---
        raw_cat = primary_news_data.get("categoryID")
        if raw_cat is None or raw_cat == "" or raw_cat.lower() == "null":
            primary_processed = {
                **primary_news_data,
                "categoryID": None
            }
        else:
            try:
                primary_processed = {
                    **primary_news_data,
                    "categoryID": int(raw_cat)
                }
            except ValueError:
                raise ValidationError("Неверный формат categoryID")

        try:
            # status_override='Approved' → Approved + publish_date поставит триггер
            g.db.news_update(
                newsID,
                user[0],
                primary_processed,
                bool(files_list),
                files_list,
                current_app.config['UPLOAD_FOLDER'],
                request.form.getlist('existing_files'),
                status_override='Approved'
            )
        except sqlite3.OperationalError as e:
            raise DatabaseError("Ошибка обновления записи") from e
        except FileNotFoundError as e:
            raise FileSystemError("Ошибка файловой системы") from e

        return jsonify({"message": "Новость успешно обновлена и одобрена"}), HTTPStatus.OK

    # DELETE: «мягкое удаление» (в корзину)
    elif request.method == "DELETE":
        try:
            g.db.news_soft_delete(newsID)
            return jsonify({
                "message": f"Новость {newsID} перемещена в корзину",
                "newsID": newsID
            }), HTTPStatus.OK
        except sqlite3.OperationalError as e:
            raise DatabaseError("Ошибка удаления новости") from e


# ===========================
#   Auth: login / register / logout
# ===========================

@bp.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    import unicodedata
    data = request.get_json()
    login = data.get("login", "").strip()
    password = data.get("password", "").strip()
    if not login or not password:
        raise ValidationError("Логин и пароль обязательны")

    norm_login = unicodedata.normalize("NFKC", login).casefold()
    matched_user = None
    for user in g.db.user_get_all():
        db_login = unicodedata.normalize("NFKC", user["login"]).casefold()
        if norm_login == db_login:
            matched_user = g.db.user_get_by_id(user["userID"])
            break

    if not matched_user or not check_password_hash(matched_user["password"], password):
        raise AuthError("Неверный логин или пароль")

    try:
        token_payload = {
            "userID":      matched_user["userID"],
            "login":       matched_user["login"],
            "user_role":   matched_user["user_role"],
            "nickname":    matched_user["nick"],
            "exp":         datetime.utcnow() + current_app.config["JWT_EXPIRATION_DELTA"]
        }
        token = jwt.encode(
            token_payload,
            current_app.config["JWT_SECRET_KEY"],
            algorithm=current_app.config["JWT_ALGORITHM"]
        )
    except jwt.PyJWTError as e:
        raise AppError("Ошибка генерации токена", loggable=False) from e

    return jsonify({
        "token":      token,
        "userID":     matched_user["userID"],
        "user_role":  matched_user["user_role"],
        "nickname":   matched_user["nick"],
        "login":      matched_user["login"]
    })


@bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    # Разрешённые поля
    allowed_fields = {"login", "password", "nickname"}
    data_fields = set(data.keys())

    # Проверяем на лишние поля
    extra_fields = data_fields - allowed_fields
    if extra_fields:
        raise ValidationError(
            "В запросе обнаружены недопустимые поля.",
            details={"extra_fields": list(extra_fields)}
        )

    login = data.get("login", "").strip()
    password = data.get("password", "").strip()
    nickname = data.get("nickname", "").strip()

    if not all([login, password, nickname]):
        raise ValidationError(
            "Все поля обязательны для заполнения: логин, пароль, никнейм",
            details={"required_fields": ["login", "password", "nickname"]}
        )
    if len(password) < 5:
        raise ValidationError(
            "Слабый пароль",
            details={"requirement": "Минимум 5 символов"}
        )

    import unicodedata
    norm_login = unicodedata.normalize("NFKC", login).casefold()
    norm_nick  = unicodedata.normalize("NFKC", nickname).casefold()
    all_users = g.db.user_get_all()
    for user in all_users:
        existing_login = unicodedata.normalize("NFKC", user["login"]).casefold()
        existing_nick  = unicodedata.normalize("NFKC", user["nick"]).casefold()
        if existing_login == norm_login:
            raise ConstraintError("Логин уже используется", constraint="unique_login")
        if existing_nick == norm_nick:
            raise ConstraintError("Никнейм уже используется", constraint="unique_nick")

    try:
        user_id = g.db.user_create(login, password, nickname)
    except ValueError as e:
        msg = str(e)
        if "логин" in msg:
            raise ConstraintError(msg, constraint="unique_login") from e
        if "никнейм" in msg:
            raise ConstraintError(msg, constraint="unique_nickname") from e
        raise ConstraintError(msg) from e

    return jsonify({
        "message": "Пользователь успешно зарегистрирован",
        "userID":  user_id
    }), HTTPStatus.OK



@bp.route("/api/auth/logout", methods=["POST", "OPTIONS"])
def logout():
    """Выход пользователя."""
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    response = jsonify({
        "status":  "success",
        "message": "Сессия успешно завершена"
    })
    response.delete_cookie(
        key="session",
        path="/",
        domain=None,
        secure=True,
        httponly=True,
        samesite="Lax"
    )
    return response


# ===========================
#     Admin: Users Management
# ===========================

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
    Список новостей со статусом 'Pending' и delete_date IS NULL.
    """
    try:
        pending_list = g.db.get_pending_news()
        return jsonify(pending_list), HTTPStatus.OK
    except DatabaseError as e:
        raise e


@bp.route("/api/admin/moderate-news/<int:newsID>", methods=["POST", "OPTIONS"])
@moderator_required
def moderate_news(newsID):
    """
    Модерация новости (approve/reject).
    При одобрении status='Approved', archive_date=NULL (триггер ставит publish_date).
    При отклонении status='Rejected', delete_date=now.
    """
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    try:
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

        news_data = g.db.get_news_single(newsID)
        if not news_data or not news_data[0]:
            raise NotFoundError(resource_type="Новость", resource_id=newsID)

        current_status = news_data[0]['status']
        if current_status != "Pending":
            raise BusinessRuleError(
                "Новость уже была модерацией обработана",
                error_code="ALREADY_MODERATED"
            )

        new_status = "Approved" if action == "approve" else "Rejected"
        moderator_id = g.current_user['userID']

        try:
            # 1) Меняем status; если Approved → сбрасываем archive_date (триггер поставит publish_date)
            g.db.cursor.execute('''
                UPDATE News
                SET status = ?,
                    moderated_byID = ?,
                    archive_date = NULL
                WHERE newsID = ?
            ''', (new_status, moderator_id, newsID))

            # 2) Если отклонено (reject) → soft delete сразу
            if action == "reject":
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
            "newsID":   newsID,
            "newStatus": new_status
        }), HTTPStatus.OK

    except json.JSONDecodeError:
        raise ValidationError("Невалидный JSON в теле запроса")
    except KeyError as e:
        raise DatabaseError(
            "Ошибка структуры данных новости",
            details={"missing_field": str(e)}
        )


@bp.route("/api/admin/users/<int:user_id>", methods=["PUT", "DELETE"])
@admin_required
def admin_user_operations(user_id):
    try:
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
    """Обработка обновления пользователя."""
    update_data = request.get_json()
    if not update_data:
        raise ValidationError("Отсутствуют данные для обновления")
    if any(value.strip() == "" for value in update_data.values()):
        raise ValidationError("Поля не могут быть пустыми")

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

    # Проверка на уникальность login и nick
    if 'login' in filtered_data or 'nick' in filtered_data:
        current_user = g.db.user_get_by_id(user_id)
        current_login = current_user['login']
        current_nick  = current_user['nick']
        import unicodedata
        norm_new_login = unicodedata.normalize("NFKC", filtered_data.get('login', current_login)).casefold()
        norm_new_nick  = unicodedata.normalize("NFKC", filtered_data.get('nick', current_nick)).casefold()

        all_users = g.db.user_get_all()
        for u in all_users:
            if u['userID'] == user_id:
                continue
            other_login = unicodedata.normalize("NFKC", u['login']).casefold()
            other_nick  = unicodedata.normalize("NFKC", u['nick']).casefold()
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

    try:
        g.db.user_update(user_id, filtered_data)
        return jsonify({
            "message": "Пользователь успешно обновлен",
            "userID":  user_id
        }), HTTPStatus.OK
    except sqlite3.IntegrityError as e:
        raise ConstraintError(
            "Нарушение целостности данных при обновлении",
            constraint=str(e)
        )


def handle_user_deletion(user_id):
    """Обработка удаления пользователя."""
    if g.current_user['userID'] == user_id:
        raise BusinessRuleError(
            "Нельзя удалить самого себя",
            error_code="SELF_DELETION"
        )
    try:
        g.db.user_delete(user_id)
        return jsonify({
            "message": "Пользователь успешно удален",
            "userID":  user_id
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
        initial_users = g.db.user_get_all()
        other_users = [u for u in initial_users if u['userID'] != current_user_id]

        if not other_users:
            raise BusinessRuleError(
                "Нет пользователей доступных для удаления",
                error_code="NO_USERS_TO_DELETE"
            )

        g.db.users_delete_all(exclude_ids=[current_user_id])
        remaining_users = g.db.user_get_all()
        return jsonify({
            "message":        "Пользователи успешно удалены",
            "remainingUsers": remaining_users,
            "deletedCount":   len(other_users)
        }), HTTPStatus.OK
    except BusinessRuleError as e:
        raise e


# ===========================
#    Categories Management
# ===========================

@bp.route("/api/categories", methods=["GET", "POST", "DELETE", "OPTIONS"])
def categories():
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    if request.method == "GET":
        return jsonify(g.db.category_get_all()), HTTPStatus.OK

    if request.method == "POST":
        @moderator_required
        def create_category():
            data = request.get_json()
            name = data.get("name", "").strip()
            description = data.get("description")

            if not name:
                raise ValidationError("Название категории обязательно")

            import unicodedata
            normalized_name = unicodedata.normalize("NFKC", name).casefold()
            for cat in g.db.category_get_all():
                existing_name = unicodedata.normalize("NFKC", cat["name"]).casefold()
                if normalized_name == existing_name:
                    raise ConstraintError("Категория с таким названием уже существует", constraint="unique_name")

            category_id = g.db.category_create(name=name, description=description)
            return jsonify({
                "message":     "Категория создана",
                "categoryID":  category_id
            }), HTTPStatus.OK
        return create_category()
    
    if request.method == "DELETE":
        @moderator_required
        def delete_category():
            category_id = request.args.get("id")
            if not category_id:
                raise ValidationError("ID категории обязательно")
            g.db.category_delete(category_id)
            return jsonify({"message": "Категория удалена"}), HTTPStatus.OK
        return delete_category()


@bp.route("/api/categories/all", methods=["DELETE", "OPTIONS"])
@moderator_required
def delete_all_categories():
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    try:
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

    import unicodedata
    normalized_name = unicodedata.normalize("NFKC", name).casefold()
    for cat in g.db.category_get_all():
        if cat["categoryID"] != category_id:
            existing_name = unicodedata.normalize("NFKC", cat["name"]).casefold()
            if normalized_name == existing_name:
                raise ConstraintError("Категория с таким названием уже существует", constraint="unique_name")

    g.db.category_update(category_id, name=name, description=description)
    return jsonify({"message": "Категория успешно обновлена"}), HTTPStatus.OK


# ===========================
#   Корзина (Trash)
# ===========================

@bp.route("/api/admin/trash", methods=["GET"])
@moderator_required
def get_trash():
    try:
        deleted_news = g.db.get_deleted_news()
        # отбираем только те, что действительно имеют delete_date
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
    news_data = g.db.get_deleted_news_single(newsID)
    if not news_data:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)
    if not news_data.get('delete_date'):
        raise BusinessRuleError("Новость не находится в корзине", error_code="NOT_IN_TRASH")

    try:
        g.db.purge_news([newsID])
        return jsonify({"message": "Новость окончательно удалена"}), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка удаления новости",
            details={"operation": "purge_single_news", "news_id": newsID}
        ) from e


@bp.route("/api/admin/trash/purge", methods=["DELETE"])
@moderator_required
def purge_trash():
    try:
        g.db.cursor.execute('''
            SELECT newsID FROM News WHERE delete_date IS NOT NULL
        ''')
        news_ids = [row[0] for row in g.db.cursor.fetchall()]
        if news_ids:
            g.db.purge_news(news_ids)
        return jsonify({
            "message": "Корзина очищена",
            "count":   len(news_ids)
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
        purged_count = g.db.purge_expired_news()
        return jsonify({
            "message": "Просроченные новости удалены",
            "count":   purged_count
        }), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка при очистке просроченных новостей",
            details={"operation": "purge_expired_news"}
        ) from e


@bp.route("/api/admin/trash/<int:newsID>/restore", methods=["POST"])
@moderator_required
def restore_news(newsID):
    """
    Восстановление из корзины:
    ● Сбрасываем delete_date, archive_date, publish_date → NULL
    ● Переводим статус → 'Pending'
    """
    news_data = g.db.get_deleted_news_single(newsID)
    if not news_data:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)
    if not news_data.get('delete_date'):
        raise BusinessRuleError("Новость не находится в корзине", error_code="NOT_IN_TRASH")

    try:
        g.db.cursor.execute('''
            UPDATE News
            SET delete_date   = NULL,
                archive_date  = NULL,
                publish_date  = NULL,
                status        = 'Pending'
            WHERE newsID = ?
        ''', (newsID,))
        g.db.connection.commit()

        return jsonify({"message": "Новость успешно восстановлена"}), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка восстановления новости",
            details={"operation": "restore_news", "news_id": newsID}
        ) from e


@bp.route("/api/admin/trash/<int:newsID>/restore-edit", methods=["POST"])
@moderator_required
def restore_edit_news(newsID):
    """
    Восстановление из корзины с переходом в редактирование (status='Pending'):
    ● Сбрасываем delete_date, archive_date, publish_date → NULL
    ● Оставляем статус 'Pending'
    """
    news_data = g.db.get_deleted_news_single(newsID)
    if not news_data:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)
    if not news_data.get('delete_date'):
        raise BusinessRuleError("Новость не находится в корзине", error_code="NOT_IN_TRASH")

    try:
        g.db.cursor.execute('''
            UPDATE News
            SET delete_date   = NULL,
                archive_date  = NULL,
                publish_date  = NULL,
                status        = 'Pending'
            WHERE newsID = ?
        ''', (newsID,))
        g.db.connection.commit()

        return jsonify({"message": "Новость подготовлена к восстановлению для редактирования"}), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка восстановления новости",
            details={"operation": "restore_edit_news", "news_id": newsID}
        ) from e


# ===========================
#    Archiving News
# ===========================

@bp.route("/api/news/<int:newsID>/archive", methods=["POST", "OPTIONS"])
@moderator_required
def archive_news(newsID):
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    try:
        news_data = g.db.get_news_single(newsID)
        if not news_data or not news_data[0]:
            raise NotFoundError(resource_type="Новость", resource_id=newsID)

        current_status = news_data[0]['status']
        if current_status == 'Archived':
            raise BusinessRuleError("Новость уже находится в архиве", error_code="ALREADY_ARCHIVED")

        # Устанавливаем status='Archived', ставим archive_date=now, сбрасываем delete_date
        g.db.cursor.execute('''
            UPDATE News
            SET status       = 'Archived',
                archive_date = datetime('now', 'localtime'),
                delete_date  = NULL
            WHERE newsID = ?
        ''', (newsID,))
        g.db.connection.commit()

        return jsonify({"message": "Новость успешно перемещена в архив"}), HTTPStatus.OK

    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка при архивации новости",
            details={"operation": "archive_news", "news_id": newsID}
        ) from e


@bp.route("/api/admin/archived-news", methods=["GET"])
@moderator_required
def archived_news():
    """
    Возвращает все новости со статусом 'Archived' и delete_date IS NULL.
    """
    try:
        archived_list = g.db.get_archived_news()
        # Отбираем только те, что имеют archive_date
        news_list = [n for n in archived_list if n.get('archive_date')]
        return jsonify(news_list), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка получения данных архива",
            details={"operation": "get_archived_news"}
        ) from e


@bp.route("/api/admin/archived-news/<int:newsID>/restore", methods=["POST", "OPTIONS"])
@moderator_required
def restore_archived_news(newsID):
    """
    Восстанавливает новость из архива в статус 'Approved':
    ● Сбрасываем archive_date, delete_date → NULL
    ● Новый статус 'Approved' (триггер сам проставит publish_date)
    """
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    news_data = g.db.get_news_single(newsID)
    if not news_data or not news_data[0]:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)

    current_status = news_data[0]['status']
    if current_status != 'Archived':
        raise BusinessRuleError("Новость не в архиве", error_code="NOT_IN_ARCHIVE")

    try:
        g.db.cursor.execute('''
            UPDATE News
            SET status       = 'Approved',
                archive_date = NULL,
                delete_date  = NULL
            WHERE newsID = ?
        ''', (newsID,))
        g.db.connection.commit()

        return jsonify({"message": f"Новость {newsID} восстановлена из архива"}), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка восстановления новости из архива",
            details={"operation": "restore_archived_news", "news_id": newsID}
        ) from e


@bp.route("/api/admin/archived-news/<int:newsID>/restore-edit", methods=["POST", "OPTIONS"])
@moderator_required
def restore_edit_archived_news(newsID):
    """
    Восстанавливает новость из архива для редактирования:
    ● Сбрасываем archive_date, delete_date, publish_date → NULL
    ● Переводим статус в 'Pending'
    """
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    news_data = g.db.get_news_single(newsID)
    if not news_data or not news_data[0]:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)

    current_status = news_data[0]['status']
    if current_status != 'Archived':
        raise BusinessRuleError("Новость не в архиве", error_code="NOT_IN_ARCHIVE")

    try:
        g.db.cursor.execute('''
            UPDATE News
            SET status       = 'Pending',
                archive_date = NULL,
                delete_date  = NULL,
                publish_date = NULL
            WHERE newsID = ?
        ''', (newsID,))
        g.db.connection.commit()

        return jsonify({"message": f"Новость {newsID} восстановлена для редактирования"}), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка восстановления новости для редактирования",
            details={"operation": "restore_edit_archived_news", "news_id": newsID}
        ) from e


@bp.route("/api/admin/archived-news/<int:newsID>/delete", methods=["DELETE", "OPTIONS"])
@moderator_required
def delete_archived_news(newsID):
    """
    Помещает новость из архива в корзину (soft delete):
    ● Вызывает news_soft_delete, 
      который сбрасывает archive_date и publish_date, 
      и ставит delete_date = now.
    """
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    news_data = g.db.get_news_single(newsID)
    if not news_data or not news_data[0]:
        raise NotFoundError(resource_type="Новость", resource_id=newsID)

    try:
        g.db.news_soft_delete(newsID)
        return jsonify({"message": f"Новость {newsID} перемещена в корзину"}), HTTPStatus.OK
    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка при перемещении архивной новости в корзину",
            details={"operation": "news_soft_delete", "news_id": newsID}
        ) from e


@bp.route("/api/admin/archived-news/delete", methods=["DELETE", "OPTIONS"])
@moderator_required
def delete_all_archived_news():
    """
    Массово помещает все новости из архива в корзину (soft delete):
    """
    if request.method == "OPTIONS":
        return jsonify({}), HTTPStatus.OK

    try:
        # Выбираем все newsID тех записей, которые в архиве и ещё не удалены
        g.db.cursor.execute('''
            SELECT newsID
              FROM News
             WHERE archive_date IS NOT NULL
               AND delete_date IS NULL
        ''')
        news_ids = [row[0] for row in g.db.cursor.fetchall()]

        if news_ids:
            g.db.news_soft_delete_multiple(news_ids)

        return jsonify({
            "message": "Все архивные новости перемещены в корзину",
            "count":   len(news_ids)
        }), HTTPStatus.OK

    except sqlite3.OperationalError as e:
        raise DatabaseError(
            "Ошибка при массовом перемещении архивных новостей в корзину",
            details={"operation": "news_soft_delete_multiple"}
        ) from e


@bp.route("/api/admin/pending-news/count", methods=["GET"])
@moderator_required
def count_pending_news():
    """
    Возвращает JSON с количеством новостей со статусом 'Pending' (delete_date IS NULL).
    """
    try:
        cnt = g.db.count_pending_news()
        return jsonify({"count": cnt}), HTTPStatus.OK
    except sqlite3.DatabaseError as e:
        raise DatabaseError(
            "Не удалось получить количество ожидающих модерацию новостей",
            details={"operation": "count_pending_news", "error": str(e)}
        ) from e

@bp.route("/api/admin/users/count", methods=["GET"])
@moderator_required
def count_users():
    """
    Возвращает JSON с количеством пользователей (всех, кроме суперудалённых).
    """
    try:
        cnt = g.db.count_users()
        return jsonify({"count": cnt}), HTTPStatus.OK
    except sqlite3.DatabaseError as e:
        raise DatabaseError(
            "Не удалось получить количество пользователей",
            details={"operation": "count_users", "error": str(e)}
        ) from e

@bp.route("/api/admin/trash/count", methods=["GET"])
@moderator_required
def count_trash_news():
    """
    Возвращает JSON с количеством новостей в корзине (delete_date IS NOT NULL).
    """
    try:
        cnt = g.db.count_trash_news()
        return jsonify({"count": cnt}), HTTPStatus.OK
    except sqlite3.DatabaseError as e:
        raise DatabaseError(
            "Не удалось получить количество новостей в корзине",
            details={"operation": "count_trash_news", "error": str(e)}
        ) from e

@bp.route("/api/admin/archive/count", methods=["GET"])
@moderator_required
def count_archived_news():
    """
    Возвращает JSON с количеством новостей в архиве (status = 'Archived', delete_date IS NULL).
    """
    try:
        cnt = g.db.count_archived_news()
        return jsonify({"count": cnt}), HTTPStatus.OK
    except sqlite3.DatabaseError as e:
        raise DatabaseError(
            "Не удалось получить количество новостей в архиве",
            details={"operation": "count_archived_news", "error": str(e)}
        ) from e
