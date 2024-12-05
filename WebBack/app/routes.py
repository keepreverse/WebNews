from app import app
import os
from flask import jsonify, request, make_response, g, send_from_directory
from flask_cors import cross_origin, CORS
from . import make_db_object

CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})


# Путь до папки с изображениями
UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), '../img')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Этот маршрут останется тем же, так как он работает с относительным путем для изображений
@app.route('/uploads/<filename>')
def upload_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/api/news", methods=["GET", "POST"])
@cross_origin()
def news_line():
    """Handler of all operations with news, such as
    their removal from the database and addition them to it."""

    make_db_object()

    if request.method == "GET":
        # Новый блок для обработки получения списка новостей
        requested_news_data = g.db.news_getlist()
        if requested_news_data:
            return make_response(jsonify(requested_news_data), 200)
        else:
            return make_response(jsonify({
                "STATUS": 404,
                "DESCRIPTION": "No news found."
            }), 404)

    if request.method == "POST":
        if all(key in ("nickname", "title", "description", "event_start") for key in request.form.keys()):
            primary_news_data = request.form
            user_id = g.db.user_auth(primary_news_data.get("nickname"))

            files_received = True
            if len(request.files) == 1 and request.files.get('files[]').filename == '':
                files_received = False

            g.db.news_add(user_id,
                          primary_news_data,
                          files_received,
                          request.files.getlist('files[]'),
                          app.config['UPLOAD_FOLDER'])

            return make_response(jsonify({
                "STATUS": 200,
                "DESCRIPTION": "It seems that news has been successfully added to database!"
            }), 200)

        else:

            return make_response(jsonify({
                "STATUS": 400,
                "DESCRIPTION": "Not enough input data for news adding. "
                               "Expected ['nickname', 'title', 'description', 'event_start']."
            }), 400)

    return make_response(jsonify({
        "STATUS": 500,
        "DESCRIPTION": "Something went wrong on server side... But what?"
    }), 500)


@app.route("/api/news/<int:newsID>", methods=["DELETE"])
@cross_origin()
def delete_single_news(newsID):
    make_db_object()
    try:
        print(f"Received request to delete news with ID: {newsID}")  # Логируем полученный ID
        g.db.news_delete(newsID)  # Вызов функции удаления новости
        return make_response(jsonify({
            "STATUS": 200,
            "DESCRIPTION": f"News with ID {newsID} has been deleted successfully!"
        }), 200)
    except Exception as e:
        print(f"Error deleting news with ID {newsID}: {str(e)}")  # Логируем ошибку
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Error deleting news with ID {newsID}: {str(e)}"
        }), 500)


# Удаление всех новостей
@app.route("/api/news", methods=["DELETE"])
@cross_origin()
def delete_all_news():
    make_db_object()
    try:
        g.db.news_clear()  # Очистить все новости из базы данных
        return make_response(jsonify({
            "STATUS": 200,
            "DESCRIPTION": "All news deleted successfully"
        }), 200)
    except Exception as e:
        return make_response(jsonify({
            "STATUS": 500,
            "DESCRIPTION": f"Failed to delete all news: {str(e)}"
        }), 500)