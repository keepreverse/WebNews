import os
import uuid
import random
import string
import sqlite3
import datetime

from enums import InvalidValues


class Storage(object):
    def __init__(self):
        self.connection = None
        self.cursor = None

    def open_connection(self):
        """
        Function for opening a tunnel between server and database.
        It doesn't make sense to call it directly, it's part of get_db_object() function.
        """

        db_path = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(db_path, 'storage.db')

        self.connection = sqlite3.connect(db_path)
        self.cursor = self.connection.cursor()

    def close_connection(self):
        """
        Function for closing a tunnel between server and database.
        It doesn't make sense to call it directly, it's part of leave_db_object() function.
        """

        if self.cursor is not None:
            self.cursor.close()

        if self.connection is not None:
            self.connection.close()

    def user_auth(self, *args) -> int:
        """
         Function for user authentication. It can take from 1 to 3 arguments.

        :param args: nickname, login, password:
        :return: userID from database. If it doesn't exist, return invalid userID.
        """

        user_id = InvalidValues.INVALID_ID.value

        # Receiving only 1 parameter, consider
        # by default that it is a NICKNAME
        if len(args) == 1:
            user_id = self.user_check(args[0])

        if user_id == InvalidValues.INVALID_ID.value:
            user_id = self.user_reg(args[0])

        return user_id

    def user_reg(self, *args) -> int:
        """
        Function for user registration. It can take from 1 to 3 arguments.

        :param args: nickname, login, password
        :return: Created user's userID.
        If invalid amount of args received - invalid userID
        """

        user_data = {
            "nickname": "",
            'login': "",
            "password": "",
            "user_role": ""
        }

        # Receiving only 1 parameter, consider
        # by default that it is a NICKNAME
        if len(args) == 1:
            user_data['nickname'] = args[0]
            user_data['login'] = "".join(random.choices(string.digits + string.ascii_letters, k=10))
            user_data['password'] = "".join(random.choices(string.digits + string.ascii_letters, k=10))
            user_data['user_role'] = "Moderator"

        # Receiving 2 parameters, consider by default that:
        # - 1st is NICKNAME
        # - 2nd is LOGIN
        elif len(args) == 2:
            user_data['nickname'] = args[0]
            user_data['login'] = args[1]
            user_data['password'] = "".join(random.choices(string.digits + string.ascii_letters, k=10))
            user_data['user_role'] = "Moderator"

        # When receiving 3 parameters, consider by default that:
        # - 1st is NICKNAME
        # - 2nd is LOGIN
        # - 3rd is PASSWORD
        elif len(args) == 3:
            user_data['nickname'] = args[0]
            user_data['login'] = args[1]
            user_data['password'] = args[2]
            user_data['user_role'] = "Moderator"

        # Otherwise return an invalid userID
        else:
            print(f"[user_reg()] INCORRECT INPUT DATA. ARGS COUNT IS {len(args)}.")
            return InvalidValues.INVALID_ID.value

        self.cursor.execute(f'''
            INSERT INTO Users (nick, login, password, user_role)
            VALUES ('{user_data["nickname"]}',
                    '{user_data["login"]}',
                    '{user_data["password"]}',
                    '{user_data["user_role"]}');
        ''')

        self.connection.commit()
        return self.user_check(args[0])

    def user_check(self, nickname: str) -> int:
        """
        Function for check user existing by his nickname.
        :param nickname:
        :return: userID
        """

        self.cursor.execute(f'''
            SELECT userID
            FROM Users
            WHERE nick = '{nickname}'
        ''')

        user_id_tuple = self.cursor.fetchone()
        if user_id_tuple is None:
            return InvalidValues.INVALID_ID.value
        else:
            return user_id_tuple[0]

    def user_getlist(self) -> tuple:
        """Function for getting all users list."""

        self.cursor.execute('''
            SELECT * FROM Users
        ''')

        return self.cursor.fetchall()

    def news_add(self, user_id, news_input_data, files_received, files_list, files_folder):
        """Function for comfortable news adding to database."""

        # Beginning of transaction for adding news
        self.cursor.execute('BEGIN TRANSACTION;')

        # What if we have any files to add?
        if files_received:
            for file in files_list:
                file_guid_name = str(uuid.uuid4().hex)
                file_format = file.mimetype.split('/')[1]
                file.save(os.path.join(files_folder, file_guid_name))

                request_file_fragment = '''
                    INSERT INTO Files (guid, format)
                    VALUES (?, ?);
                '''

                request_file_params = (
                    file_guid_name,
                    file_format
                )

                self.cursor.execute(request_file_fragment, request_file_params)

        request_news_text = '''
            INSERT INTO News (publisherID, moderated_byID, title,
                                description, status, event_start,
                                event_end, publish_date, create_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        '''

        request_news_params = (
            user_id,
            None,
            news_input_data.get("title"),
            news_input_data.get("description"),
            "Unchecked",
            news_input_data.get("event_start"),
            news_input_data.get("event_end") if ("event_end" in news_input_data
                                                 or news_input_data.get("event_end") == '') else None,
            None,
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        self.cursor.execute(request_news_text, request_news_params)

        if files_received:
            # File with news linking
            for i in range(0, len(files_list)):
                request_file_link_fragment = f'''
                    INSERT INTO File_Link (fileID, newsID)
                    VALUES (
                        (SELECT fileID FROM Files ORDER BY fileID DESC LIMIT 1 OFFSET {i}),
                        (SELECT newsID FROM News ORDER BY newsID DESC LIMIT 1)
                    );
                '''

                self.cursor.execute(request_file_link_fragment)

        # End of transaction for adding news
        self.connection.commit()

    def news_getlist(self) -> list:
        """Function for getting all news list."""

        final_news_data_list = []
        news_data_fragment = self.news_get_one(InvalidValues.INVALID_ID.value)
        if news_data_fragment[0] == {}:
            return []

        print(final_news_data_list)
        print()

        while news_data_fragment[1] != InvalidValues.INVALID_ID.value:
            final_news_data_list.append(news_data_fragment[0])
            print(final_news_data_list)
            print()

            news_data_fragment = self.news_get_one(news_data_fragment[1])

        return final_news_data_list

    def news_get_one(self, last_received_newsID) -> list[dict | int]:
        if last_received_newsID == InvalidValues.INVALID_ID.value:
            get_last_news_request = '''
                SELECT n.newsID, title, description,
                        status, create_date, publish_date,
                        event_start, event_end,
                        up.nick AS publisher_nick, um.nick AS moderator_nick 
                FROM News n 
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN Users um ON um.userID = n.moderated_byID
                WHERE create_date = (SELECT MAX(create_date) FROM News)
                LIMIT 1;
            '''
        else:
            get_last_news_request = f'''
                SELECT n.newsID, title, description, status, 
                        create_date, publish_date, 
                        event_start, event_end,
                        up.nick AS publisher_nick, um.nick AS moderator_nick 
                FROM News n
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN Users um ON um.userID = n.moderated_byID
                WHERE newsID < '{last_received_newsID}'
                ORDER BY create_date DESC
                LIMIT 1;
            '''

        self.cursor.execute(get_last_news_request)
        received_news_data = self.cursor.fetchone()

        if received_news_data is not None:
            self.cursor.execute(f'''
                SELECT f.fileID, guid, format FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID 
                WHERE newsID = {received_news_data[0]}
            ''')

            final_news_files_data = []
            received_news_files_data = self.cursor.fetchall()

            if len(received_news_files_data) != 0:
                for file in received_news_files_data:
                    final_news_files_fragment = {
                        'fileID': file[0],
                        'fileName': file[1],
                        'fileFormat': file[2]
                    }
                    final_news_files_data.append(final_news_files_fragment)

            # Получаем путь до изображения (например, через http://127.0.0.1:5000/uploads/)
            image_urls = [f"http://127.0.0.1:5000/uploads/{file[1]}" for file in received_news_files_data]

            final_news_data = {
                'newsID': received_news_data[0],
                'title': received_news_data[1],
                'description': received_news_data[2],
                'files': final_news_files_data,
                'imageUrl': image_urls[0] if image_urls else None,  # Возвращаем первый путь к изображению
                'status': received_news_data[3],
                'create_date': received_news_data[4],
                'publish_date': received_news_data[5],
                'event_start': received_news_data[6],
                'event_end': received_news_data[7],
                'publisher_nick': received_news_data[8],
                'moderator_nick': received_news_data[9],
            }

            return [final_news_data, received_news_data[0]]
        else:
            return [{}, -1]


    def news_clear(self):
        """Function for deleting all news from database and all unused files from IMG folder."""
        
        # Получаем список всех файлов, которые ещё привязаны к новостям
        self.cursor.execute('''
            SELECT guid FROM Files
            WHERE fileID IN (SELECT fileID FROM File_Link WHERE newsID != -1)
        ''')
        used_files = {row[0] for row in self.cursor.fetchall()}

        print("Used files:", used_files)  # Для отладки, чтобы увидеть какие файлы используются

        # Удаляем все новости, файлы и связанные данные из базы данных
        self.cursor.execute('DELETE FROM Users WHERE userID != -1')
        self.cursor.execute('DELETE FROM News WHERE newsID != -1')
        self.cursor.execute('DELETE FROM Files WHERE fileID != -1')
        self.cursor.execute('DELETE FROM File_link WHERE file_linkID != -1')

        # Получаем папку с изображениями
        img_folder = os.path.abspath('img')

        # Удаляем все файлы из папки
        img_folder = os.path.abspath('img')
        for img_name in os.listdir(img_folder):
            img_path = os.path.join(img_folder, img_name)

            if os.path.isfile(img_path) or os.path.islink(img_path):
                os.unlink(img_path)

        self.connection.commit()


    def news_delete(self, newsID: int):
        """Function to delete a single news entry and related files from the database and file system."""
        
        # Получаем список файлов, привязанных к конкретной новости
        self.cursor.execute(f'''
            SELECT guid FROM Files 
            WHERE fileID IN (SELECT fileID FROM File_Link WHERE newsID = {newsID})
        ''')
        files_to_delete = {row[0] for row in self.cursor.fetchall()}

        # Удаляем все связанные данные в базе данных
        self.cursor.execute('BEGIN TRANSACTION;')

        # Удаляем связь между файлами и новостью
        self.cursor.execute(f'DELETE FROM File_Link WHERE newsID = {newsID};')

        # Удаляем файлы, привязанные к новости
        self.cursor.execute(f'DELETE FROM Files WHERE fileID IN (SELECT fileID FROM File_Link WHERE newsID = {newsID});')

        # Удаляем саму новость
        self.cursor.execute(f'DELETE FROM News WHERE newsID = {newsID};')

        # Удаляем файлы из файловой системы
        img_folder = os.path.abspath('img')
        for img_name in files_to_delete:
            img_path = os.path.join(img_folder, img_name)
            if os.path.isfile(img_path) or os.path.islink(img_path):
                os.unlink(img_path)

        # Заканчиваем транзакцию
        self.connection.commit()
