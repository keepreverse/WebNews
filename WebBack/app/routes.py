from app import app
import os
from flask import jsonify, request, make_response, g, send_from_directory
from flask_cors import cross_origin, CORS
from . import make_db_object

# Настройки CORS с разрешением всех необходимых методов
CORS(app, resources={
    r"/api/*": {
        "origins": "http://localhost:3000",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Путь до папки с изображениями
UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), '../img')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/uploads/<filename>')
def upload_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/api/news", methods=["GET", "POST", "DELETE"])
@cross_origin()
def news_line():
    """Handler for news list operations"""
    make_db_object()

    if request.method == "GET":
        requested_news_data = g.db.news_getlist()
        if requested_news_data:
            return make_response(jsonify(requested_news_data), 200)
        return make_response(jsonify({
            "STATUS": 404,
            "DESCRIPTION": "No news found."
        }), 404)

    elif request.method == "POST":
        if all(key in ("nickname", "title", "description", "event_start") for key in request.form.keys()):
            primary_news_data = request.form
            user_id = g.db.user_auth(primary_news_data.get("nickname"))

            files_received = len(request.files) > 0 and request.files.get('files[]').filename != ''

            g.db.news_add(
                user_id,
                primary_news_data,
                files_received,
                request.files.getlist('files[]'),
                app.config['UPLOAD_FOLDER']
            )

            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "News successfully added to database!"
            }), 200)

        return make_response(jsonify({
            "STATUS": 400,
            "DESCRIPTION": "Missing required fields."
        }), 400)

    elif request.method == "DELETE":
        try:
            g.db.news_clear()
            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "All news deleted successfully"
            }), 200)
        except Exception as e:
            return make_response(jsonify({
                "STATUS": 500,
                "DESCRIPTION": f"Failed to delete all news: {str(e)}"
            }), 500)

    return make_response(jsonify({
        "STATUS": 405,
        "DESCRIPTION": "Method not allowed"
    }), 405)

@app.route("/api/news/<int:newsID>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@cross_origin()
def single_news(newsID):
    """Handler for single news operations"""
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
            if all(key in ("nickname", "title", "description", "event_start") 
                 for key in request.form.keys()):
                
                primary_news_data = request.form
                user_id = g.db.user_auth(primary_news_data.get("nickname"))
                
                files_received = len(request.files) > 0 and request.files.get('files[]').filename != ''
                
                g.db.news_update(
                    newsID,
                    user_id,
                    primary_news_data,
                    files_received,
                    request.files.getlist('files[]'),
                    app.config['UPLOAD_FOLDER']
                )
                
                return make_response(jsonify({
                    "STATUS": 200,
                    "DESCRIPTION": "News updated successfully!"
                }), 200)
            
            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Missing required fields."
            }), 400)
            
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

    elif request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    return make_response(jsonify({
        "STATUS": 405,
        "DESCRIPTION": "Method not allowed"
    }), 405)

@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
@cross_origin()
def login():
    """User authentication endpoint"""
    if request.method == "OPTIONS":
        return make_response(jsonify({}), 200)

    make_db_object()
    try:
        data = request.json
        login = data.get("login")
        password = data.get("password")

        g.db.cursor.execute('''
            SELECT userID, user_role
            FROM Users
            WHERE login = ? AND password = ?
        ''', (login, password))

        user = g.db.cursor.fetchone()
        if user:
            return make_response(jsonify({
                "STATUS": 200,
                "userID": user[0],
                "userRole": user[1]
            }), 200)
        
        return make_response(jsonify({
            "STATUS": 401,
            "DESCRIPTION": "Invalid login or password."
        }), 401)

    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Server error: {str(e)}"
        }), 500)