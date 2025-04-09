import os
import uuid
import random
import string
import sqlite3
import datetime

from enums import InvalidValues

from werkzeug.security import generate_password_hash, check_password_hash


class Storage(object):
    def __init__(self):
        self.connection = None
        self.cursor = None
        self.db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'storage.db')

    def open_connection(self):
        """Open database connection with timeout and check_same_thread=False"""
        if self.connection is None:
            self.connection = sqlite3.connect(
                self.db_path,
                timeout=10,  # Увеличиваем таймаут
                check_same_thread=False  # Разрешаем использование из разных потоков
            )
            self.connection.row_factory = sqlite3.Row
            self.cursor = self.connection.cursor()
            # Включаем WAL режим для лучшей параллельной работы
            self.cursor.execute('PRAGMA journal_mode=WAL')
            self.connection.commit()

    def close_connection(self):
        """Close database connection if it exists"""
        if self.connection:
            try:
                self.connection.close()
            except:
                pass
            finally:
                self.connection = None
                self.cursor = None

    # News methods
    def news_add(self, user_id, news_input_data, files_received, files_list, files_folder):
        """Add new news item"""
        self.cursor.execute('BEGIN TRANSACTION;')

        # Add files if present
        if files_received:
            for file in files_list:
                file_guid = str(uuid.uuid4().hex)
                file.save(os.path.join(files_folder, file_guid))
                
                self.cursor.execute('''
                    INSERT INTO Files (guid, format)
                    VALUES (?, ?)
                ''', (file_guid, file.mimetype.split('/')[1]))

        # Add news entry
        self.cursor.execute('''
            INSERT INTO News (publisherID, title, description, status, 
                            event_start, event_end, create_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            news_input_data.get("title"),
            news_input_data.get("description"),
            "Unchecked",
            news_input_data.get("event_start"),
            news_input_data.get("event_end", None),
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        # Link files to news
        if files_received:
            news_id = self.cursor.lastrowid
            for i in range(len(files_list)):
                self.cursor.execute('''
                    INSERT INTO File_Link (fileID, newsID)
                    VALUES (
                        (SELECT fileID FROM Files ORDER BY fileID DESC LIMIT 1 OFFSET ?),
                        ?
                    )
                ''', (i, news_id))

        self.connection.commit()

    def news_getlist(self) -> list:
        """Get all news items"""
        news_list = []
        current_news = self.news_get_one(InvalidValues.INVALID_ID.value)
        
        while current_news[1] != InvalidValues.INVALID_ID.value:
            news_list.append(current_news[0])
            current_news = self.news_get_one(current_news[1])
            
        return news_list

    def news_get_one(self, last_received_newsID) -> list:
        """Get single news item"""
        if last_received_newsID == InvalidValues.INVALID_ID.value:
            query = '''
                SELECT n.newsID, title, description, status,
                       create_date, publish_date, event_start, event_end,
                       up.nick AS publisher_nick, um.nick AS moderator_nick
                FROM News n
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN Users um ON um.userID = n.moderated_byID
                ORDER BY create_date DESC LIMIT 1
            '''
        else:
            query = f'''
                SELECT n.newsID, title, description, status,
                       create_date, publish_date, event_start, event_end,
                       up.nick AS publisher_nick, um.nick AS moderator_nick
                FROM News n
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN Users um ON um.userID = n.moderated_byID
                WHERE n.newsID < {last_received_newsID}
                ORDER BY create_date DESC LIMIT 1
            '''

        self.cursor.execute(query)
        news_data = self.cursor.fetchone()
        
        if not news_data:
            return [{}, InvalidValues.INVALID_ID.value]

        # Get files for news
        self.cursor.execute('''
            SELECT f.fileID, guid, format 
            FROM Files f
            JOIN File_Link fl ON fl.fileID = f.fileID
            WHERE fl.newsID = ?
        ''', (news_data[0],))
        
        files = [{
            'fileID': row[0],
            'fileName': row[1],
            'fileFormat': row[2]
        } for row in self.cursor.fetchall()]

        return [{
            'newsID': news_data[0],
            'title': news_data[1],
            'description': news_data[2],
            'status': news_data[3],
            'create_date': news_data[4],
            'publish_date': news_data[5],
            'event_start': news_data[6],
            'event_end': news_data[7],
            'publisher_nick': news_data[8],
            'moderator_nick': news_data[9],
            'files': files
        }, news_data[0]]

    def news_get_single(self, newsID: int) -> list:
        """Get specific news item by ID"""
        self.cursor.execute('''
            SELECT n.newsID, title, description, status,
                   create_date, publish_date, event_start, event_end,
                   up.nick AS publisher_nick, um.nick AS moderator_nick
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            WHERE n.newsID = ?
        ''', (newsID,))
        
        news_data = self.cursor.fetchone()
        if not news_data:
            return [{}, InvalidValues.INVALID_ID.value]

        # Get files for news
        self.cursor.execute('''
            SELECT f.fileID, guid, format 
            FROM Files f
            JOIN File_Link fl ON fl.fileID = f.fileID
            WHERE fl.newsID = ?
        ''', (newsID,))
        
        files = [{
            'fileID': row[0],
            'fileName': row[1],
            'fileFormat': row[2]
        } for row in self.cursor.fetchall()]

        return [{
            'newsID': news_data[0],
            'title': news_data[1],
            'description': news_data[2],
            'status': news_data[3],
            'create_date': news_data[4],
            'publish_date': news_data[5],
            'event_start': news_data[6],
            'event_end': news_data[7],
            'publisher_nick': news_data[8],
            'moderator_nick': news_data[9],
            'files': files
        }, news_data[0]]

    def news_update(self, news_id, user_id, news_data, files_received, files, upload_folder, existing_files=None):
        """Update existing news item"""
        self.cursor.execute('BEGIN TRANSACTION;')
        
        try:
            # Update news info
            self.cursor.execute('''
                UPDATE News
                SET title = ?, description = ?, event_start = ?, publisherID = ?
                WHERE newsID = ?
            ''', (
                news_data.get('title'),
                news_data.get('description'),
                news_data.get('event_start'),
                user_id,
                news_id
            ))

            # Удаляем только те файлы, которые не в списке existing_files
            if existing_files:
                placeholders = ','.join(['?'] * len(existing_files))
                self.cursor.execute(f'''
                    DELETE FROM Files
                    WHERE fileID IN (
                        SELECT fl.fileID FROM File_Link fl
                        WHERE fl.newsID = ? AND fl.fileID NOT IN (
                            SELECT f.fileID FROM Files f
                            WHERE f.guid IN ({placeholders})
                        )
                    )
                ''', [news_id] + existing_files)
            else:
                # Если нет existing_files, удаляем все
                self.cursor.execute('''
                    DELETE FROM Files
                    WHERE fileID IN (
                        SELECT fileID FROM File_Link WHERE newsID = ?
                    )
                ''', (news_id,))
                
            self.cursor.execute('DELETE FROM File_Link WHERE newsID = ?', (news_id,))

            # Добавляем новые файлы
            if files_received:
                for file in files:
                    if file.filename:
                        file_guid = str(uuid.uuid4().hex)
                        file.save(os.path.join(upload_folder, file_guid))
                        
                        self.cursor.execute('''
                            INSERT INTO Files (guid, format)
                            VALUES (?, ?)
                        ''', (file_guid, file.mimetype.split('/')[1]))
                        
                        self.cursor.execute('''
                            INSERT INTO File_Link (fileID, newsID)
                            VALUES (last_insert_rowid(), ?)
                        ''', (news_id,))

            # Восстанавливаем привязки к существующим файлам
            if existing_files:
                for file_guid in existing_files:
                    self.cursor.execute('''
                        INSERT INTO File_Link (fileID, newsID)
                        SELECT fileID, ? FROM Files WHERE guid = ?
                    ''', (news_id, file_guid))

            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def news_delete(self, newsID: int):
        """Delete single news item"""
        self.cursor.execute('BEGIN TRANSACTION;')
        
        try:
            # Get files to delete
            self.cursor.execute('''
                SELECT guid FROM Files
                WHERE fileID IN (
                    SELECT fileID FROM File_Link WHERE newsID = ?
                )
            ''', (newsID,))
            files_to_delete = [row[0] for row in self.cursor.fetchall()]

            # Delete from File_Link
            self.cursor.execute('DELETE FROM File_Link WHERE newsID = ?', (newsID,))
            
            # Delete from Files
            self.cursor.execute('''
                DELETE FROM Files
                WHERE fileID IN (
                    SELECT fileID FROM File_Link WHERE newsID = ?
                )
            ''', (newsID,))
            
            # Delete from News
            self.cursor.execute('DELETE FROM News WHERE newsID = ?', (newsID,))

            # Delete actual files
            img_folder = os.path.abspath('img')
            for img_name in files_to_delete:
                img_path = os.path.join(img_folder, img_name)
                if os.path.isfile(img_path) or os.path.islink(img_path):
                    os.unlink(img_path)

            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def news_clear(self):
        """Delete all news"""
        self.cursor.execute('BEGIN TRANSACTION;')
        
        try:
            # Get all files to delete
            self.cursor.execute('''
                SELECT guid FROM Files
                WHERE fileID IN (
                    SELECT fileID FROM File_Link WHERE newsID != -1
                )
            ''')
            files_to_delete = [row[0] for row in self.cursor.fetchall()]

            # Clear all tables
            self.cursor.execute('DELETE FROM File_Link WHERE newsID != -1')
            self.cursor.execute('DELETE FROM Files WHERE fileID != -1')
            self.cursor.execute('DELETE FROM News WHERE newsID != -1')

            # Delete actual files
            img_folder = os.path.abspath('img')
            for img_name in os.listdir(img_folder):
                img_path = os.path.join(img_folder, img_name)

                if os.path.isfile(img_path) or os.path.islink(img_path):
                    os.unlink(img_path)

            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e
            
    def user_get_by_nick(self, nick: str):
        """Get user by nickname with password hash"""
        self.cursor.execute('''
            SELECT userID, password, user_role, nick, login 
            FROM Users 
            WHERE nick = ?
        ''', (nick,))
        return self.cursor.fetchone()

    def user_get_by_login(self, login: str):
        """Get user by login with password hash"""
        self.cursor.execute('''
            SELECT userID, password, user_role, nick, login 
            FROM Users 
            WHERE login = ?
        ''', (login,))
        return self.cursor.fetchone()

    def user_create(self, login: str, password: str, nickname: str, role: str = "Publisher"):
        if role not in ("Administrator", "Moderator", "Publisher"):
            role = "Publisher"
        
        # Проверка уникальности
        self.cursor.execute('SELECT 1 FROM Users WHERE login = ? OR nick = ?', (login, nickname))
        if self.cursor.fetchone():
            raise ValueError("User with this login or nickname already exists")
        
        hashed_password = generate_password_hash(password)
        
        # Добавляем реальный пароль (ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ)
        self.cursor.execute('''
            INSERT INTO Users (login, password, real_password, nick, user_role)
            VALUES (?, ?, ?, ?, ?)
        ''', (login, hashed_password, password, nickname, role))
        self.connection.commit()
        return self.cursor.lastrowid

    # В класс Storage в db.py добавляем метод:
    def user_get_all(self) -> list:
        """Get all users"""
        self.cursor.execute('''
            SELECT userID, login, nick, user_role 
            FROM Users
            ORDER BY userID
        ''')
        return [dict(row) for row in self.cursor.fetchall()]

    def user_get_all_with_passwords(self) -> list:
        """Get all users with password hashes (for admin only)"""
        self.cursor.execute('''
            SELECT userID, login, nick, user_role, password 
            FROM Users
            ORDER BY userID
        ''')
        return [dict(row) for row in self.cursor.fetchall()]
    
    def user_get_all_with_real_passwords(self) -> list:
        """Get all users with real passwords (FOR DEBUG ONLY)"""
        # Только для разработки!
        # В production этот метод должен быть отключен
        self.cursor.execute('''
            SELECT userID, login, nick, user_role, real_password
            FROM Users
            ORDER BY userID
        ''')
        return [dict(row) for row in self.cursor.fetchall()]
            
    def user_update(self, user_id, update_data):
        """Update user data"""
        allowed_fields = ["nick", "user_role"]
        updates = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not updates:
            raise ValueError("No valid fields to update")
        
        set_clause = ", ".join([f"{field} = ?" for field in updates.keys()])
        query = f"UPDATE Users SET {set_clause} WHERE userID = ?"
        
        self.cursor.execute(query, (*updates.values(), user_id))
        self.connection.commit()