import os
import jwt
import sqlite3
from app import app
from . import make_db_object
from datetime import datetime, timedelta
from flask import jsonify, request, make_response, g, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split()[1]
        
        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            g.current_user = data
        except Exception as e:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated

# Путь до папки с изображениями
UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), '../img')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/uploads/<filename>')
def upload_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/api/news", methods=["GET", "POST", "DELETE", "OPTIONS"])
def news_line():
    """Handler for news list operations"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    make_db_object()

    if request.method == "GET":
        try:
            news_list = g.db.news_getlist()
            return make_response(jsonify(news_list), 200)
        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Error fetching news: {str(e)}"
            }), 500)

    elif request.method == "POST":
        try:
            # Проверяем обязательные поля
            required_fields = ["login", "nickname", "title", "description", "event_start"]
            if not all(field in request.form for field in required_fields):
                return make_response(jsonify({
                    "STATUS": 400,
                    "DESCRIPTION": "Missing required fields."
                }), 400)

            primary_news_data = request.form
            login = primary_news_data.get("login")
            
            # Получаем пользователя по login
            user = g.db.user_get_by_login(login)
            
            if not user:
                return make_response(jsonify({
                    "STATUS": 401,
                    "DESCRIPTION": "Invalid user credentials."
                }), 401)

            # Обработка файлов
            files_received = 'files' in request.files
            files_list = request.files.getlist('files') if files_received else []

            # Получаем статус из формы (по умолчанию "Pending")
            status = "Pending"

            g.db.news_add(
                user[0],  # userID
                {
                    **primary_news_data,
                    "status": status
                },
                files_received,
                files_list,
                app.config['UPLOAD_FOLDER']
            )

            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "News successfully added to database!"
            }), 200)

        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Server error: {str(e)}"
            }), 500)
        
    elif request.method == "DELETE":
        try:
            # Проверка прав (добавьте свою логику проверки прав)
            # if not is_admin(request):
            #     return make_response(jsonify({"error": "Forbidden"}), 403
            
            g.db.news_clear()
            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "All news deleted successfully!"
            }), 200)
        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Error deleting news: {str(e)}"
            }), 500)

@app.route("/api/news/<int:newsID>", methods=["GET", "PUT", "DELETE", "OPTIONS"])

def single_news(newsID):
    """Handler for single news operations"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    make_db_object()

    if request.method == "GET":
        news_data = g.db.news_get_single(newsID)
        if news_data[0]:
            return make_response(jsonify(news_data[0]), 200)
        return make_response(jsonify({
            "STATUS": 404,
            "DESCRIPTION": f"News with ID {newsID} not found."
        }), 404)

    elif request.method == "PUT":
        try:
            # Проверяем обязательные поля
            required_fields = ["login", "nickname", "title", "description", "event_start"]
            if not all(field in request.form for field in required_fields):
                return make_response(jsonify({
                    "STATUS": 400,
                    "DESCRIPTION": "Недостаточно данных"
                }), 400)
                
            primary_news_data = request.form
            
            # Получаем пользователя
            user = g.db.user_get_by_login(primary_news_data.get("login"))
            if not user:
                return make_response(jsonify({
                    "STATUS": 401,
                    "DESCRIPTION": "Неверные данные пользователя"
                }), 401)
            
            # Обработка файлов
            files_received = 'files' in request.files
            files_list = request.files.getlist('files') if files_received else []
            
            # Существующие файлы
            existing_files = request.form.getlist('existing_files')
            
            g.db.news_update(
                newsID,
                user[0],  # userID
                primary_news_data,
                files_received,
                files_list,
                app.config['UPLOAD_FOLDER'],
                existing_files
            )
            
            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "News updated successfully!"
            }), 200)
            
        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Error updating news: {str(e)}"
            }), 500)

    elif request.method == "DELETE":
        try:
            g.db.news_delete(newsID)
            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": f"News with ID {newsID} deleted successfully!"
            }), 200)
        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Error deleting news: {str(e)}"
            }), 500)

    return make_response(jsonify({
        "STATUS": 405,
        "DESCRIPTION": "Method not allowed"
    }), 405)

@app.route("/api/auth/login", methods=["POST", "OPTIONS"])

def login():
    """User authentication endpoint"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    make_db_object()
    try:
        data = request.get_json(silent=True) or {}
        login = data.get("login")
        password = data.get("password")

        if not login or not password:
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Необходимо ввести логин и пароль"
            }), 400)

        user = g.db.user_get_by_login(login)
        if not user or not check_password_hash(user[1], password):
            return make_response(jsonify({
                "STATUS": 401,
                "DESCRIPTION": "Неверный логин или пароль"
            }), 401)

        return make_response(jsonify({
            "STATUS": 200,
            "userID": user[0],
            "userRole": user[2],
            "nickname": user[3]
        }), 200)

    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Server error: {str(e)}"
        }), 500)

@app.route("/api/auth/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    try:
        data = request.get_json()
        if not data:
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Invalid request data"
            }), 400)

        login = data.get("login", "").strip()
        password = data.get("password", "").strip()
        nickname = data.get("nickname", "").strip()

        if not all([login, password, nickname]):
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "All fields are required"
            }), 400)

        # Открываем соединение с повторными попытками
        make_db_object()

        # Проверяем существование пользователя
        g.db.cursor.execute("BEGIN IMMEDIATE")
        try:
            g.db.cursor.execute(
                "SELECT 1 FROM Users WHERE login = ? OR nick = ?",
                (login, nickname)
            )
            if g.db.cursor.fetchone():
                g.db.connection.rollback()
                return make_response(jsonify({
                    "STATUS": 409,
                    "DESCRIPTION": "User already exists"
                }), 409)

            # Создаем пользователя (сохраняем и хеш, и реальный пароль)
            hashed_pw = generate_password_hash(password)
            g.db.cursor.execute(
                """INSERT INTO Users 
                (login, password, real_password, nick, user_role) 
                VALUES (?, ?, ?, ?, ?)""",
                (login, hashed_pw, password, nickname, "Publisher")
            )
            g.db.connection.commit()

            return make_response(jsonify({
                "STATUS": 201,
                "DESCRIPTION": "Registration successful",
                "userID": g.db.cursor.lastrowid
            }), 201)

        except sqlite3.OperationalError:
            g.db.connection.rollback()
            return make_response(jsonify({
                "STATUS": 503,
                "DESCRIPTION": "Database busy, please try again"
            }), 503)
        except Exception as e:
            g.db.connection.rollback()
            raise

    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": "Internal server error"
        }), 500)
    
@app.route("/api/auth/logout", methods=["POST", "OPTIONS"])
def logout():
    """User logout endpoint"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
        
    response = make_response(jsonify({
        "STATUS": 200,
        "DESCRIPTION": "Logged out successfully"
    }), 200)
    
    # Очищаем куки, если они используются
    response.set_cookie('session', '', expires=0)
    
    return response


@app.route("/api/admin/users", methods=["GET"])
@jwt_required  # Добавляем JWT-аутентификацию
def admin_users():
    """Admin endpoint to get all users (without sensitive data)"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    # Проверка прав администратора через JWT
    if g.current_user['userRole'] != 'Administrator':
        return make_response(jsonify({"error": "Forbidden"}), 403)
    
    make_db_object()
    
    try:
        # Безопасная версия - не возвращаем пароли!
        users = g.db.user_get_all()  # Используйте новый метод без паролей
        return make_response(jsonify(users), 200)
    except Exception as e:
        return make_response(jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500)
    
@app.route("/api/admin/users/real_passwords", methods=["GET", "OPTIONS"])
def admin_users_real_passwords():
    """Admin endpoint to get all users with real passwords (ONLY FOR DEMO/DEBUG)"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    # Проверка прав администратора
    # if not is_admin(request):
    #     return make_response(jsonify({"error": "Forbidden"}), 403
    
    make_db_object()
    
    try:
        # В реальном приложении пароли не должны храниться в открытом виде!
        # Это только для демонстрационных целей
        #users = g.db.user_get_all_with_real_passwords()
        users = g.db.user_get_all()
        return make_response(jsonify(users), 200)
    except Exception as e:
        app.logger.error(f"Error fetching users with real passwords: {str(e)}")
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": "Internal server error"
        }), 500)

@app.route("/api/admin/users/<int:user_id>", methods=["PUT", "DELETE", "OPTIONS"])
def admin_user_operations(user_id):
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    # Проверка прав администратора
    # if not is_admin(request):
    #     return make_response(jsonify({"error": "Forbidden"}), 403
    
    make_db_object()

    try:
        if request.method == "PUT":
            update_data = request.get_json()
            if not update_data:
                return make_response(jsonify({
                    "STATUS": 400,
                    "DESCRIPTION": "Необходимо указать данные для обновления"
                }), 400)

            # Используем метод из Storage
            g.db.user_update(user_id, update_data)
            
            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "Данные пользователя обновлены"
            }), 200)

        elif request.method == "DELETE":
            # Нельзя удалить самого себя
            # current_user = get_current_user(request)
            # if current_user and current_user["userID"] == user_id:
            #     return make_response(jsonify({
            #         "STATUS": 403,
            #         "DESCRIPTION": "Нельзя удалить самого себя"
            #     }), 403)

            # Используем метод из Storage
            g.db.user_delete(user_id)
            
            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "Пользователь удален"
            }), 200)

    except ValueError as e:
        return make_response(jsonify({
            "STATUS": 400,
            "DESCRIPTION": str(e)
        }), 400)
    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Ошибка сервера: {str(e)}"
        }), 500)

    return make_response(jsonify({
        "STATUS": 405,
        "DESCRIPTION": "Method not allowed"
    }), 405)


@app.route("/api/admin/pending-news", methods=["GET", "OPTIONS"])
def admin_pending_news():
    """Get all pending news for moderation"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    make_db_object()
    
    try:
        # Получаем новости со статусом "Pending" и связанные файлы
        g.db.cursor.execute('''
            SELECT n.newsID, title, description, status, create_date,
                   event_start, event_end, up.nick AS publisher_nick,
                   f.fileID, f.guid, f.format
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN File_Link fl ON fl.newsID = n.newsID
            LEFT JOIN Files f ON f.fileID = fl.fileID
            WHERE n.status = 'Pending'
            ORDER BY n.create_date DESC
        ''')
        
        # Собираем данные в структурированный формат
        pending_news = {}
        for row in g.db.cursor.fetchall():
            news_id = row['newsID']
            if news_id not in pending_news:
                pending_news[news_id] = {
                    'newsID': news_id,
                    'title': row['title'],
                    'description': row['description'],
                    'status': row['status'],
                    'create_date': row['create_date'],
                    'event_start': row['event_start'],
                    'event_end': row['event_end'],
                    'publisher_nick': row['publisher_nick'],
                    'files': []
                }
            
            if row['fileID']:  # Если есть файлы
                pending_news[news_id]['files'].append({
                    'fileID': row['fileID'],
                    'fileName': row['guid'],
                    'fileFormat': row['format']
                })
        
        return make_response(jsonify(list(pending_news.values())), 200)
    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Error fetching pending news: {str(e)}"
        }), 500)

@app.route("/api/admin/moderate-news/<int:newsID>", methods=["POST", "OPTIONS"])
def moderate_news(newsID):
    """Moderate news (approve/reject)"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    make_db_object()
    
    try:
        # Проверка прав администратора/модератора
        # if not check_admin(request):
        #     return make_response(jsonify({"error": "Forbidden"}), 403
        
        data = request.get_json()
        if not data:
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Необходимо указать данные"
            }), 400)
            
        action = data.get("action")  # "approve" или "reject"
        moderator_id = data.get("moderator_id")  # ID модератора
        
        if not moderator_id:
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Не указан ID модератора"
            }), 400)
            
        if action not in ["approve", "reject"]:
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Допустимые действия: approve или reject"
            }), 400)

        # Проверяем существование новости
        news_data = g.db.news_get_single(newsID)
        if not news_data[0]:
            return make_response(jsonify({
                "STATUS": 404,
                "DESCRIPTION": "Новость не найдена"
            }), 404)
            
        # Проверяем статус новости (должна быть "Pending")
        if news_data[0]['status'] != "Pending":
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Новость уже была промодерирована"
            }), 400)
        
        # Обновляем статус новости
        new_status = "Approved" if action == "approve" else "Rejected"

        # Удаляем файлы только при отклонении
        if action == "reject":
            g.db.news_delete_files(newsID)

        # Единый запрос на обновление статуса
        g.db.cursor.execute('''
            UPDATE News
            SET status = ?, moderated_byID = ?
            WHERE newsID = ?
        ''', (new_status, moderator_id, newsID))
        
        g.db.connection.commit()
        
        return make_response(jsonify({
            "STATUS": 200,
            "DESCRIPTION": f"News {action}d successfully",
            "newsID": newsID,
            "newStatus": new_status
        }), 200)
        
    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Error moderating news: {str(e)}"
        }), 500)
    
@app.route("/api/news/<int:newsID>/archive", methods=["POST", "OPTIONS"])
def archive_news(newsID):
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    make_db_object()
    
    try:
        # Проверка прав
        # if not check_admin(request):
        #     return make_response(jsonify({"error": "Forbidden"}), 403)
        
        # Обновляем статус на Archived
        g.db.cursor.execute('''
            UPDATE News
            SET status = 'Archived'
            WHERE newsID = ?
        ''', (newsID,))
        
        g.db.connection.commit()
        
        return make_response(jsonify({
            "STATUS": 200,
            "DESCRIPTION": "News archived successfully"
        }), 200)
        
    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Error archiving news: {str(e)}"
        }), 500)