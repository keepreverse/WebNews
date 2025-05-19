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

    def user_get_by_token(self, token):
        self.cursor.execute('''SELECT userID, password, user_role FROM Users WHERE auth_token = ?''', (token,))
        return self.cursor.fetchone()

    def user_set_token(self, user_id, token):
        self.cursor.execute('''UPDATE Users SET auth_token = ? WHERE userID = ?''', (token, user_id))
        self.connection.commit()
        
    def _create_indexes(self):
        """Создать индексы при подключении к БД"""
        try:
            # Users
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login ON Users(login)')
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nick ON Users(nick)')
            
            # News
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_publisher ON News(publisherID)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_status ON News(status)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_create_date ON News(create_date)')
            
            # Files
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_files_guid ON Files(guid)')
            
            self.connection.commit()
        except sqlite3.OperationalError as e:
            print(f"Ошибка создания индексов: {str(e)}")


    def _create_triggers(self):
        """Создать триггеры при подключении к БД"""
        try:
            # Триггер для каскадного удаления файлов при удалении новости
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS delete_news_files
                AFTER DELETE ON News
                FOR EACH ROW
                BEGIN
                    DELETE FROM File_Link WHERE newsID = OLD.newsID;
                    DELETE FROM Files WHERE fileID NOT IN (SELECT fileID FROM File_Link);
                END;
            ''')

            # Триггер для проверки дат событий
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS validate_event_dates
                BEFORE INSERT ON News
                FOR EACH ROW
                WHEN NEW.event_end IS NOT NULL AND NEW.event_start > NEW.event_end
                BEGIN
                    SELECT RAISE(ABORT, 'event_start must be <= event_end');
                END;
            ''')

            # Триггер для обновления publish_date
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS update_publish_date
                AFTER UPDATE OF status ON News
                FOR EACH ROW
                WHEN NEW.status = 'Approved' AND OLD.status != 'Approved'
                BEGIN
                    UPDATE News SET publish_date = datetime('now') WHERE newsID = NEW.newsID;
                END;
            ''')

        except sqlite3.OperationalError as e:
            print(f"Ошибка создания триггеров: {str(e)}")

    def open_connection(self):
        """Open database connection with timeout and check_same_thread=False"""
        if self.connection is None:
            self.connection = sqlite3.connect(
                self.db_path,
                timeout=10,
                check_same_thread=False
            )
            self.connection.row_factory = sqlite3.Row
            self.cursor = self.connection.cursor()
            
            # Включаем WAL режим
            self.cursor.execute('PRAGMA journal_mode=WAL')
            
            # Создаем триггеры и индексы
            self._create_triggers()
            self._create_indexes()
            
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
            news_input_data.get("status", "Pending"),  # Статус по умолчанию
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
        """Get all news items with single query"""
        self.cursor.execute('''
            SELECT n.newsID, title, description, status,
                create_date, publish_date, event_start, event_end,
                up.nick AS publisher_nick, um.nick AS moderator_nick
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            ORDER BY n.create_date DESC
        ''')
        
        news_items = []
        for row in self.cursor.fetchall():
            news_id = row[0]
            # Получаем файлы для каждой новости с сортировкой по fileID
            self.cursor.execute('''
                SELECT f.fileID, guid, format 
                FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID
                WHERE fl.newsID = ?
                ORDER BY f.fileID ASC
            ''', (news_id,))
            
            files = [{
                'fileID': r[0],
                'fileName': r[1],
                'fileFormat': r[2]
            } for r in self.cursor.fetchall()]
            
            news_items.append({
                'newsID': news_id,
                'title': row[1],
                'description': row[2],
                'status': row[3],
                'create_date': row[4],
                'publish_date': row[5],
                'event_start': row[6],
                'event_end': row[7],
                'publisher_nick': row[8],
                'moderator_nick': row[9],
                'files': files
            })
        
        return news_items

    # def news_get_one(self, last_received_newsID) -> list:
    #     """Get single news item"""
    #     if last_received_newsID == InvalidValues.INVALID_ID.value:
    #         query = '''
    #             SELECT n.newsID, title, description, status,
    #                    create_date, publish_date, event_start, event_end,
    #                    up.nick AS publisher_nick, um.nick AS moderator_nick
    #             FROM News n
    #             JOIN Users up ON up.userID = n.publisherID
    #             LEFT JOIN Users um ON um.userID = n.moderated_byID
    #             ORDER BY create_date DESC LIMIT 1
    #         '''
    #     else:
    #         query = f'''
    #             SELECT n.newsID, title, description, status,
    #                    create_date, publish_date, event_start, event_end,
    #                    up.nick AS publisher_nick, um.nick AS moderator_nick
    #             FROM News n
    #             JOIN Users up ON up.userID = n.publisherID
    #             LEFT JOIN Users um ON um.userID = n.moderated_byID
    #             WHERE n.newsID < {last_received_newsID}
    #             ORDER BY create_date DESC LIMIT 1
    #         '''

    #     self.cursor.execute(query)

    # database/db.py (частично)
    def news_get_one(self, last_received_newsID) -> list:
        query = '''
            SELECT n.newsID, title, description, status,
                create_date, publish_date, event_start, event_end,
                up.nick AS publisher_nick, um.nick AS moderator_nick
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            WHERE n.newsID < ?
            ORDER BY create_date DESC LIMIT 1
        ''' if last_received_newsID != InvalidValues.INVALID_ID.value else '''
            SELECT n.newsID, title, description, status,
                create_date, publish_date, event_start, event_end,
                up.nick AS publisher_nick, um.nick AS moderator_nick
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            ORDER BY create_date DESC LIMIT 1
        '''

        params = (last_received_newsID,) if last_received_newsID != InvalidValues.INVALID_ID.value else ()
        self.cursor.execute(query, params)
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

        # Get files for news with sorting
        self.cursor.execute('''
            SELECT f.fileID, guid, format 
            FROM Files f
            JOIN File_Link fl ON fl.fileID = f.fileID
            WHERE fl.newsID = ?
            ORDER BY f.fileID ASC
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
            # 1. Обновление основной информации о новости
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

            # 2. Обработка файлов
            all_existing_files = existing_files if existing_files else []
            files_to_delete = []

            if not all_existing_files:
                # Случай 1: Полное удаление всех файлов
                self.cursor.execute('''
                    SELECT guid FROM Files
                    WHERE fileID IN (
                        SELECT fileID FROM File_Link WHERE newsID = ?
                    )
                ''', (news_id,))
                files_to_delete = [row[0] for row in self.cursor.fetchall()]

                # Удаляем связи и файлы
                self.cursor.execute('DELETE FROM File_Link WHERE newsID = ?', (news_id,))
                self.cursor.execute('DELETE FROM Files WHERE fileID IN (SELECT fileID FROM File_Link WHERE newsID = ?)', (news_id,))

            else:
                # Случай 2: Частичное удаление
                placeholders = ','.join(['?'] * len(all_existing_files))
                
                # Получаем файлы для удаления
                self.cursor.execute(f'''
                    SELECT guid FROM Files
                    WHERE fileID IN (
                        SELECT fileID FROM File_Link WHERE newsID = ?
                    )
                    AND guid NOT IN ({placeholders})
                ''', [news_id] + all_existing_files)
                files_to_delete = [row[0] for row in self.cursor.fetchall()]

                # Удаляем файлы из БД
                self.cursor.execute(f'''
                    DELETE FROM Files 
                    WHERE fileID IN (
                        SELECT fl.fileID FROM File_Link fl
                        WHERE fl.newsID = ? 
                        AND fl.fileID NOT IN (
                            SELECT f.fileID FROM Files f
                            WHERE f.guid IN ({placeholders})
                        )
                    )
                ''', [news_id] + all_existing_files)

                # Обновляем связи
                self.cursor.execute('DELETE FROM File_Link WHERE newsID = ?', (news_id,))
                for guid in all_existing_files:
                    self.cursor.execute('''
                        INSERT INTO File_Link (fileID, newsID)
                        SELECT fileID, ? FROM Files WHERE guid = ?
                    ''', (news_id, guid))

            # 3. Физическое удаление файлов
            img_folder = os.path.abspath('img')
            for img_name in files_to_delete:
                img_path = os.path.join(img_folder, img_name)
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except Exception as e:
                        print(f"Ошибка удаления файла {img_path}: {str(e)}")

            # 4. Добавление новых файлов
            if files_received and files:
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

            self.connection.commit()

        except Exception as e:
            self.connection.rollback()
            raise e
    
    def news_delete(self, newsID: int):
        """Delete single news item"""
        self.cursor.execute('BEGIN TRANSACTION;')
        
        try:
            # Получаем GUID файлов для физического удаления
            self.cursor.execute('''
                SELECT guid FROM Files
                WHERE fileID IN (
                    SELECT fileID FROM File_Link WHERE newsID = ?
                )
            ''', (newsID,))
            files_to_delete = [row[0] for row in self.cursor.fetchall()]

            # Удаляем новость (триггер delete_news_files сделает остальное)
            self.cursor.execute('DELETE FROM News WHERE newsID = ?', (newsID,))

            # Удаляем файлы из файловой системы
            img_folder = os.path.abspath('img')
            for img_name in files_to_delete:
                img_path = os.path.join(img_folder, img_name)
                if os.path.isfile(img_path) or os.path.islink(img_path):
                    os.unlink(img_path)

            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def news_delete_files(self, newsID: int):
        """Удалить файлы новости (без удаления самой новости)"""
        self.cursor.execute('BEGIN TRANSACTION;')
        try:
            # Получаем GUID файлов для удаления
            self.cursor.execute('''
                SELECT guid FROM Files
                WHERE fileID IN (
                    SELECT fileID FROM File_Link WHERE newsID = ?
                )
            ''', (newsID,))
            files_to_delete = [row[0] for row in self.cursor.fetchall()]

            # Удаляем связи и файлы
            self.cursor.execute('DELETE FROM File_Link WHERE newsID = ?', (newsID,))
            self.cursor.execute('DELETE FROM Files WHERE fileID IN (SELECT fileID FROM File_Link WHERE newsID = ?)', (newsID,))

            # Удаляем файлы из файловой системы
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
            # Получаем все файлы для удаления
            self.cursor.execute('SELECT guid FROM Files')
            files_to_delete = [row[0] for row in self.cursor.fetchall()]

            # Удаляем все новости (триггеры очистят File_Link и Files)
            self.cursor.execute('DELETE FROM News')

            # Удаляем файлы из папки
            img_folder = os.path.abspath('img')
            for img_name in files_to_delete:
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
            SELECT userID, login, nick, user_role, password, real_password
            FROM Users
            ORDER BY userID
        ''')
        return [dict(row) for row in self.cursor.fetchall()]
            
    def user_update(self, user_id, update_data):
        """Update user data"""
        allowed_fields = ["nick", "login", "user_role"]
        updates = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not updates:
            raise ValueError("No valid fields to update")
        
        set_clause = ", ".join([f"{field} = ?" for field in updates.keys()])
        query = f"UPDATE Users SET {set_clause} WHERE userID = ?"
        
        self.cursor.execute(query, (*updates.values(), user_id))
        self.connection.commit()

    def user_delete(self, user_id):
        """Delete user by ID"""
        self.cursor.execute("DELETE FROM Users WHERE userID = ?", (user_id,))
        self.connection.commit()
