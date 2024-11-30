from flask import Flask, g
from database.db import Storage

import os

app = Flask(__name__)

img_dir_name = 'img'
work_path = os.getcwd()
img_dir_path = os.path.join(work_path, img_dir_name)

if not os.path.exists(img_dir_path):
    os.makedirs(img_dir_path)

app.config.from_object('config')


def make_db_object():
    """Function for creating connection with database and making global `db` object."""

    if 'db' not in g:
        db = Storage()
        db.open_connection()
        g.db = db


@app.teardown_appcontext
def leave_db_object(exception):
    """Function for closing connection with database and deleting global `db` object."""

    db = g.pop('db', None)

    if db is not None:
        db.close_connection()


from app import routes
