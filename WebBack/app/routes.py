from flask import Blueprint, jsonify, request, make_response, g, send_from_directory, current_app
from .decorators import admin_required, moderator_required
import jwt
import sqlite3
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

bp = Blueprint('main', __name__)

@bp.errorhandler(403)
def forbidden(error):
    return make_response(jsonify({
        "error": "Forbidden: insufficient permissions"
    }), 403)

@bp.route('/uploads/<filename>')
def upload_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@bp.route("/api/news", methods=["GET", "POST", "DELETE", "OPTIONS"])
def news_line():
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    if request.method == "GET":
        try:
            news_list = g.db.news_getlist()
            return make_response(jsonify(news_list), 200)
        except Exception as e:
            return make_response(jsonify({
                "error": "Internal server error",
                "details": str(e)
            }), 500)

    elif request.method == "POST":
        try:
            required_fields = ["login", "nickname", "title", "description", "event_start"]
            if not all(field in request.form for field in required_fields):
                return make_response(jsonify({
                    "error": "Missing required fields: " + ", ".join(required_fields)
                }), 400)

            primary_news_data = request.form
            login = primary_news_data.get("login")
            
            user = g.db.user_get_by_login(login)
            if not user:
                return make_response(jsonify({
                    "error": "Invalid user credentials"
                }), 401)

            files_received = 'files' in request.files
            files_list = request.files.getlist('files') if files_received else []

            # Валидация файлов
            MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
            ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
            for file in files_list:
                if file.content_length > MAX_FILE_SIZE:
                    return make_response(jsonify({
                        "error": f"File {file.filename} exceeds size limit"
                    }), 400)
                if not ('.' in file.filename and 
                      file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
                    return make_response(jsonify({
                        "error": f"Invalid file type: {file.filename}"
                    }), 400)

            g.db.news_add(
                user[0],
                {**primary_news_data, "status": "Pending"},
                files_received,
                files_list,
                current_app.config['UPLOAD_FOLDER']
            )

            return make_response(jsonify({
                "message": "News successfully added"
            }), 201)

        except Exception as e:
            return make_response(jsonify({
                "error": "Internal server error",
                "details": str(e)
            }), 500)
    elif request.method == "DELETE":
        try:
            if not current_app.config.get('UPLOAD_FOLDER'):
                return make_response(jsonify({
                    "error": "Server configuration error"
                }), 500)
                
            g.db.news_clear()
            return make_response(jsonify({
                "message": "All news deleted successfully"
            }), 200)
        except Exception as e:
            print(f"ERROR: {str(e)}")
            return make_response(jsonify({
                "error": "Internal server error",
                "details": str(e)
            }), 500)


@bp.route("/api/news/<int:newsID>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
def single_news(newsID):
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    if request.method == "GET":
        news_data = g.db.news_get_single(newsID)
        if news_data[0]:
            return make_response(jsonify(news_data[0]), 200)
        return make_response(jsonify({
            "error": f"News with ID {newsID} not found"
        }), 404)

    elif request.method == "PUT":
        try:
            required_fields = ["login", "nickname", "title", "description", "event_start"]
            if not all(field in request.form for field in required_fields):
                return make_response(jsonify({
                    "error": "Missing required fields"
                }), 400)
                
            primary_news_data = request.form
            user = g.db.user_get_by_login(primary_news_data.get("login"))
            if not user:
                return make_response(jsonify({
                    "error": "Invalid user credentials"
                }), 401)
            
            files_received = 'files' in request.files
            files_list = request.files.getlist('files') if files_received else []
            existing_files = request.form.getlist('existing_files')
            
            # Валидация новых файлов
            MAX_FILE_SIZE = 5 * 1024 * 1024
            ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
            for file in files_list:
                if file.content_length > MAX_FILE_SIZE:
                    return make_response(jsonify({
                        "error": f"File {file.filename} exceeds size limit"
                    }), 400)
                if not ('.' in file.filename and 
                      file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
                    return make_response(jsonify({
                        "error": f"Invalid file type: {file.filename}"
                    }), 400)

            g.db.news_update(
                newsID,
                user[0],
                primary_news_data,
                files_received,
                files_list,
                current_app.config['UPLOAD_FOLDER'],
                existing_files
            )
            
            return make_response(jsonify({
                "message": "News updated successfully"
            }), 200)
            
        except Exception as e:
            return make_response(jsonify({
                "error": "Internal server error",
                "details": str(e)
            }), 500)

    elif request.method == "DELETE":
        try:
            g.db.news_delete(newsID)
            return make_response(jsonify({
                "message": f"News with ID {newsID} deleted"
            }), 200)
        except Exception as e:
            return make_response(jsonify({
                "error": "Internal server error",
                "details": str(e)
            }), 500)

@bp.route("/api/auth/login", methods=["POST"])
def login():
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    
    try:
        data = request.get_json()
        login = data.get("login", "").strip()
        password = data.get("password", "").strip()

        if not login or not password:
            return make_response(jsonify({
                "error": "Login and password required"
            }), 400)

        user = g.db.user_get_by_login(login)
        if not user or not check_password_hash(user[1], password):
            return make_response(jsonify({
                "error": "Invalid credentials"
            }), 401)

        token_payload = {
            'userID': user[0],
            'login': user[4],
            'user_role': user[2],
            'nickname': user[3],
            'exp': datetime.utcnow() + current_app.config['JWT_EXPIRATION_DELTA']
        }
        
        token = jwt.encode(
            token_payload,
            current_app.config['JWT_SECRET_KEY'],
            algorithm=current_app.config['JWT_ALGORITHM']
        )

        return make_response(jsonify({
            "token": token,
            "userID": user[0],
            "user_role": user[2],
            "nickname": user[3],
            "login": user[4]
        }), 200)

    except Exception as e:
        return make_response(jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500)

@bp.route("/api/auth/register", methods=["POST"])
def register():
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    try:
        data = request.get_json()
        login = data.get("login", "").strip()
        password = data.get("password", "").strip()
        nickname = data.get("nickname", "").strip()

        if not all([login, password, nickname]):
            return make_response(jsonify({
                "error": "All fields are required: login, password, nickname"
            }), 400)

        
        
        try:
            g.db.cursor.execute("BEGIN IMMEDIATE")
            if g.db.user_get_by_login(login) or g.db.user_get_by_nick(nickname):
                return make_response(jsonify({
                    "error": "User with this login or nickname already exists"
                }), 409)

            hashed_pw = generate_password_hash(password)
            g.db.cursor.execute(
                """INSERT INTO Users 
                (login, password, real_password, nick, user_role) 
                VALUES (?, ?, ?, ?, ?)""",
                (login, hashed_pw, password, nickname, "Publisher")
            )
            g.db.connection.commit()

            return make_response(jsonify({
                "message": "User registered successfully",
                "userID": g.db.cursor.lastrowid
            }), 201)

        except sqlite3.OperationalError:
            return make_response(jsonify({
                "error": "Database operation failed"
            }), 503)
            
    except Exception as e:
        return make_response(jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500)

@bp.route("/api/auth/logout", methods=["POST", "OPTIONS"])
def logout():
    """User logout endpoint"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
        
    response = make_response(jsonify({
        "STATUS": 200,
        "DESCRIPTION": "Logged out successfully"
    }), 200)
    
    response.set_cookie('session', '', expires=0)
    
    return response

@bp.route("/api/admin/users", methods=["GET"])
@moderator_required
def admin_users():
    try:
        
        users = g.db.user_get_all()
        return make_response(jsonify(users), 200)
    except Exception as e:
        return make_response(jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500)

@bp.route("/api/admin/users/real_passwords", methods=["GET"])
@admin_required
def admin_users_real_passwords():
    try:
        
        users = g.db.user_get_all_with_real_passwords()
        return make_response(jsonify(users), 200)
    except Exception as e:
        return make_response(jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500)

@bp.route("/api/admin/pending-news", methods=["GET"])
@moderator_required
def admin_pending_news():
    try:
        
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
            "error": "Failed to fetch pending news",
            "details": str(e)
        }), 500)

@bp.route("/api/admin/moderate-news/<int:newsID>", methods=["POST", "OPTIONS"])
@moderator_required
def moderate_news(newsID):
    """Moderate news (approve/reject)"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    if g.current_user['user_role'] not in ['Administrator', 'Moderator']:
        return make_response(jsonify({
            "error": "Только администраторы и модераторы могут просматривать эту страницу"
        }), 403)
    
    
    
    try:
        data = request.get_json()
        if not data:
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Необходимо указать данные"
            }), 400)
            
        action = data.get("action")  # "approve" или "reject"
        
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
        moderator_id = g.current_user['userID']

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

@bp.route("/api/news/<int:newsID>/archive", methods=["POST", "OPTIONS"])
def archive_news(newsID):
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)
    
    
    
    try:
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

@bp.route("/api/admin/users/<int:user_id>", methods=["PUT", "DELETE"])
@admin_required
def admin_user_operations(user_id):
    try:
        
        
        if request.method == "PUT":
            update_data = request.get_json()
            if not update_data:
                return make_response(jsonify({
                    "error": "No update data provided"
                }), 400)

            allowed_fields = ["nick", "login", "user_role"]
            filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
            
            if not filtered_data:
                return make_response(jsonify({
                    "error": "No valid fields to update"
                }), 400)

            g.db.user_update(user_id, filtered_data)
            return make_response(jsonify({
                "message": "User updated successfully"
            }), 200)

        elif request.method == "DELETE":
            if g.current_user['userID'] == user_id:
                return make_response(jsonify({
                    "error": "Cannot delete yourself"
                }), 403)

            g.db.user_delete(user_id)
            return make_response(jsonify({
                "message": "User deleted successfully"
            }), 200)

    except ValueError as e:
        return make_response(jsonify({
            "error": str(e)
        }), 400)
    except Exception as e:
        return make_response(jsonify({
            "error": "Operation failed",
            "details": str(e)
        }), 500)