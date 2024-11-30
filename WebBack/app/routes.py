from app import app
from flask import jsonify, request, make_response, g
from . import make_db_object

from flask_cors import cross_origin


@app.route("/api/news", methods=["GET", "POST", "DELETE"])
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

    if request.method == 'DELETE':
        g.db.news_clear()

        return make_response(jsonify({
            "STATUS": 200,
            "DESCRIPTION": "Seems like you just deleted all news from database successfully!"
        }))

    return make_response(jsonify({
        "STATUS": 500,
        "DESCRIPTION": "Something went wrong on server side... But what?"
    }), 500)
