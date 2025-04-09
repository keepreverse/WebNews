import os
import sqlite3
from app import app
from . import make_db_object
from flask import jsonify, request, make_response, g, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash


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
            required_fields = ["nickname", "title", "description", "event_start"]
            if not all(field in request.form for field in required_fields):
                return make_response(jsonify({
                    "STATUS": 400,
                    "DESCRIPTION": "Missing required fields."
                }), 400)

            primary_news_data = request.form
            nickname = primary_news_data.get("nickname")
            
            # Получаем пользователя по nickname
            user = g.db.user_get_by_nick(nickname)
            
            if not user:
                return make_response(jsonify({
                    "STATUS": 401,
                    "DESCRIPTION": "Invalid user credentials."
                }), 401)

            # Обработка файлов
            files_received = 'files' in request.files
            files_list = request.files.getlist('files') if files_received else []

            g.db.news_add(
                user[0],  # userID
                primary_news_data,
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
            required_fields = ["nickname", "title", "description", "event_start"]
            if not all(field in request.form for field in required_fields):
                return make_response(jsonify({
                    "STATUS": 400,
                    "DESCRIPTION": "Недостаточно данных"
                }), 400)
                
            primary_news_data = request.form
            
            # Получаем пользователя
            user = g.db.user_get_by_login(primary_news_data.get("nickname"))
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

            # Создаем пользователя
            hashed_pw = generate_password_hash(password)
            g.db.cursor.execute(
                "INSERT INTO Users (login, password, nick, user_role) VALUES (?, ?, ?, ?)",
                (login, hashed_pw, nickname, "Publisher")
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

def check_admin():
    """Проверка прав администратора"""
    # Здесь должна быть ваша логика проверки прав
    # Например, проверка сессии или JWT-токена
    return True  # Заглушка - замените на реальную проверку

@app.route("/api/admin/users", methods=["GET", "OPTIONS"])
def admin_users():
    """Admin endpoint to get all users with password hashes"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    # Проверка прав администратора (реализуйте свою логику)
    # if not is_admin(request):
    #     return make_response(jsonify({"error": "Forbidden"}), 403)
    
    make_db_object()
    
    try:
        users = g.db.user_get_all_with_passwords()
        return make_response(jsonify(users), 200)
    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Error fetching users: {str(e)}"
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
        users = g.db.user_get_all_with_real_passwords()
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

    if request.method == "PUT":
        try:
            update_data = request.get_json()
            if not update_data:
                return make_response(jsonify({
                    "STATUS": 400,
                    "DESCRIPTION": "Необходимо указать данные для обновления"
                }), 400)

            # Обновляем только разрешенные поля
            allowed_fields = ["nick", "user_role"]
            updates = {k: v for k, v in update_data.items() if k in allowed_fields}
            
            if not updates:
                return make_response(jsonify({
                    "STATUS": 400,
                    "DESCRIPTION": "Нет допустимых полей для обновления"
                }), 400)

            set_clause = ", ".join([f"{field} = ?" for field in updates.keys()])
            query = f"UPDATE Users SET {set_clause} WHERE userID = ?"
            
            g.db.cursor.execute(query, (*updates.values(), user_id))
            g.db.connection.commit()

            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "Данные пользователя обновлены"
            }), 200)

        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Ошибка обновления пользователя: {str(e)}"
            }), 500)

    elif request.method == "DELETE":
        try:
            # Нельзя удалить самого себя
            # current_user = get_current_user(request)
            # if current_user and current_user["userID"] == user_id:
            #     return make_response(jsonify({
            #         "STATUS": 403,
            #         "DESCRIPTION": "Нельзя удалить самого себя"
            #     }), 403)

            g.db.cursor.execute("DELETE FROM Users WHERE userID = ?", (user_id,))
            g.db.connection.commit()

            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "Пользователь удален"
            }), 200)

        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Ошибка удаления пользователя: {str(e)}"
            }), 500)

    return make_response(jsonify({
        "STATUS": 405,
        "DESCRIPTION": "Method not allowed"
    }), 405)