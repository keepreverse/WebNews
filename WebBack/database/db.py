import os
import uuid
import random
import string
import sqlite3
import datetime

from flask import current_app
from enums import InvalidValues
from werkzeug.security import generate_password_hash
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
 
    def _create_tables(self):
        """Создать все таблицы при подключении к БД"""
        try:
            # 1. Таблица Users
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS Users (
                    userID INTEGER PRIMARY KEY AUTOINCREMENT,
                    nick TEXT NOT NULL COLLATE NOCASE,
                    login TEXT NOT NULL COLLATE NOCASE,
                    password TEXT NOT NULL,
                    user_role TEXT NOT NULL CHECK(
                        user_role IN ('Administrator', 'Moderator', 'Publisher')
                    ),
                    real_password TEXT,
                    registration_date TEXT NOT NULL DEFAULT ''
                )
            ''')

            # 2. Таблица News (с учетом categoryID)
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS News (
                    newsID INTEGER PRIMARY KEY AUTOINCREMENT,
                    publisherID INTEGER NOT NULL,
                    moderated_byID INTEGER,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Pending' CHECK(
                        status IN ('Pending', 'Approved', 'Rejected', 'Archived')
                    ),
                    event_start TEXT NOT NULL,
                    event_end TEXT,
                    publish_date TEXT,
                    create_date TEXT NOT NULL,
                    delete_date TEXT,
                    categoryID INTEGER,
                    FOREIGN KEY (publisherID) REFERENCES Users(userID) ON DELETE CASCADE,
                    FOREIGN KEY (moderated_byID) REFERENCES Users(userID) ON DELETE SET NULL,
                    FOREIGN KEY (categoryID) REFERENCES Categories(categoryID) ON DELETE SET NULL
                )
            ''')

            # 3. Таблица Files
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS Files (
                    fileID INTEGER PRIMARY KEY AUTOINCREMENT,
                    guid TEXT NOT NULL,
                    format TEXT NOT NULL
                )
            ''')

            # 4. Таблица File_Link
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS File_Link (
                    file_linkID INTEGER PRIMARY KEY AUTOINCREMENT,
                    fileID INTEGER NOT NULL,
                    newsID INTEGER NOT NULL,
                    FOREIGN KEY (fileID) REFERENCES Files(fileID) ON DELETE CASCADE,
                    FOREIGN KEY (newsID) REFERENCES News(newsID) ON DELETE CASCADE
                )
            ''')

            # 5. Таблица Categories (главное исправление здесь)
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS Categories (
                    categoryID INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                    description TEXT,
                    create_date TEXT NOT NULL
                )
            ''')

            self.connection.commit()
        except sqlite3.OperationalError as e:
            print(f"Ошибка создания таблиц: {str(e)}")
 
    def _create_indexes(self):
        """Создать индексы при подключении к БД"""
        try:
            # Для Users
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nick_nocase ON Users(nick COLLATE NOCASE)')
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_nocase ON Users(login COLLATE NOCASE)')

            # Для News
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_publisher ON News(publisherID)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_status ON News(status)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_create_date ON News(create_date)')
            
            # Для Files
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_files_guid ON Files(guid)')
            
            # Categories
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_nocase ON Categories(name COLLATE NOCASE)')

            self.connection.commit()
        except sqlite3.OperationalError as e:
            print(f"Ошибка создания индексов: {str(e)}")

    def _create_triggers(self):
        """Создать триггеры при подключении к БД"""
        try:
            # Для Users
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS set_registration_date
                AFTER INSERT ON Users
                FOR EACH ROW
                WHEN NEW.registration_date IS NULL OR NEW.registration_date = ''
                BEGIN
                    UPDATE Users 
                    SET registration_date = datetime('now', 'localtime') 
                    WHERE userID = NEW.userID;
                END;
            ''')

            # Для News
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS validate_event_dates
                BEFORE INSERT ON News
                FOR EACH ROW
                WHEN NEW.event_end IS NOT NULL AND NEW.event_start > NEW.event_end
                BEGIN
                    SELECT RAISE(ABORT, 'event_start must be <= event_end');
                END;
            ''')

            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS update_publish_date
                AFTER UPDATE OF status ON News
                FOR EACH ROW
                WHEN NEW.status = 'Approved' AND OLD.status != 'Approved'
                BEGIN
                    UPDATE News SET publish_date = datetime('now', 'localtime') WHERE newsID = NEW.newsID;
                END;
            ''')

            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS delete_news_files
                AFTER DELETE ON News
                FOR EACH ROW
                BEGIN
                    DELETE FROM Files 
                    WHERE fileID IN (
                        SELECT fileID FROM File_Link WHERE newsID = OLD.newsID
                    );
                END;
            ''')

            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS reset_category_on_delete
                AFTER DELETE ON Categories
                FOR EACH ROW
                BEGIN
                    UPDATE News SET categoryID = NULL WHERE categoryID = OLD.categoryID;
                END;
            ''')

            self.connection.commit()
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
            
            self.cursor.execute('PRAGMA journal_mode=WAL')
            
            # Правильный порядок инициализации
            self._create_tables()     # 1. Таблицы
            self._create_indexes()    # 2. Индексы
            self._create_triggers()   # 3. Триггеры
            
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
                file_format = file.filename.rsplit('.', 1)[1].lower()
                file.save(os.path.join(files_folder, file_guid))
                
                self.cursor.execute('''
                    INSERT INTO Files (guid, format)
                    VALUES (?, ?)
                ''', (file_guid, file_format))  

        # Add news entry
        self.cursor.execute('''
            INSERT INTO News (publisherID, title, description, status, 
                            event_start, event_end, create_date, categoryID)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?)
        ''', (
            user_id,
            news_input_data.get("title"),
            news_input_data.get("description"),
            news_input_data.get("status", "Pending"),  # Статус по умолчанию
            news_input_data.get("event_start"),
            news_input_data.get("event_end", None),
            news_input_data.get("categoryID")
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

    def get_news(self) -> list:
        """Get all news items with single query"""
        try:
            self.cursor.execute('''
                SELECT 
                    n.newsID, 
                    n.title, 
                    n.description, 
                    n.status,
                    n.create_date, 
                    n.publish_date, 
                    n.event_start, 
                    n.event_end,
                    up.nick AS publisher_nick, 
                    um.nick AS moderator_nick,
                    c.name AS category_name
                FROM News n
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN Users um ON um.userID = n.moderated_byID
                LEFT JOIN Categories c ON c.categoryID = n.categoryID
                WHERE n.delete_date IS NULL
                GROUP BY n.newsID
                ORDER BY n.create_date DESC
            ''')
            
            news_items = []
            for row in self.cursor.fetchall():
                news_id = row['newsID']
                
                # Get files
                self.cursor.execute('''
                    SELECT f.fileID, guid, format 
                    FROM Files f
                    JOIN File_Link fl ON fl.fileID = f.fileID
                    WHERE fl.newsID = ?
                    ORDER BY f.fileID ASC
                ''', (news_id,))
                
                files = [{
                    'fileID': r['fileID'],
                    'fileName': r['guid'],
                    'fileFormat': r['format']
                } for r in self.cursor.fetchall()]
                
                news_items.append({
                    'newsID': news_id,
                    'title': row['title'],
                    'description': row['description'],
                    'status': row['status'],
                    'create_date': row['create_date'],
                    'publish_date': row['publish_date'],
                    'event_start': row['event_start'],
                    'event_end': row['event_end'],
                    'publisher_nick': row['publisher_nick'],
                    'moderator_nick': row['moderator_nick'],
                    'category_name': row['category_name'],
                    'files': files
                })
            return news_items
        
        except sqlite3.OperationalError as e:
            raise Exception("Ошибка базы данных. Попробуйте позже") from e
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise Exception("Такая запись уже существует")

    def get_news_single(self, newsID: int) -> list:
        """Get specific news item by ID"""
        # Get main news data
        self.cursor.execute('''
            SELECT 
                n.newsID, 
                n.title, 
                n.description, 
                n.status,
                n.create_date, 
                n.publish_date, 
                n.event_start, 
                n.event_end,
                up.nick AS publisher_nick, 
                um.nick AS moderator_nick,
                c.name AS category_name,
                n.categoryID
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            LEFT JOIN Categories c ON c.categoryID = n.categoryID
            WHERE n.newsID = ? 
            AND n.delete_date IS NULL
        ''', (newsID,))
        
        news_data = self.cursor.fetchone()
        if not news_data:
            return [{}, InvalidValues.INVALID_ID.value]

        self.cursor.execute('''
            SELECT f.fileID, guid, format 
            FROM Files f
            JOIN File_Link fl ON fl.fileID = f.fileID
            WHERE fl.newsID = ?
            ORDER BY f.fileID ASC
        ''', (newsID,))
        
        files = [{
            'fileID': row['fileID'],
            'fileName': row['guid'],
            'fileFormat': row['format']
        } for row in self.cursor.fetchall()]

        return [{
            'newsID': news_data['newsID'],
            'title': news_data['title'],
            'description': news_data['description'],
            'status': news_data['status'],
            'create_date': news_data['create_date'],
            'publish_date': news_data['publish_date'],
            'event_start': news_data['event_start'],
            'event_end': news_data['event_end'],
            'publisher_nick': news_data['publisher_nick'],
            'moderator_nick': news_data['moderator_nick'],
            'categoryID': news_data['categoryID'],
            'category_name': news_data['category_name'],
            'files': files
        }, news_data['newsID']]

    def news_update(self, news_id, user_id, news_data, files_received, files, upload_folder, existing_files=None, status_override=None):
        """Update existing news item with optional status change"""
        self.cursor.execute('BEGIN TRANSACTION;')
        
        try:
            # 1. Обновление основной информации о новости
            update_query = '''
                UPDATE News
                SET title = ?, description = ?, event_start = ?, publisherID = ?, categoryID = ?
            '''
            update_values = [
                news_data.get('title'),
                news_data.get('description'),
                news_data.get('event_start'),
                user_id,
                news_data.get('categoryID')
            ]

            # Добавим изменение статуса, если передан параметр
            if status_override:
                update_query += ', status = ?'
                update_values.append(status_override)

            update_query += ' WHERE newsID = ?'
            update_values.append(news_id)

            self.cursor.execute(update_query, tuple(update_values))

            # --- остальной код без изменений ---
            # Удаление/обновление файлов, как в твоей версии:
            all_existing_files = existing_files if existing_files else []
            files_to_delete = []

            if not all_existing_files:
                self.cursor.execute('''
                    SELECT guid FROM Files
                    WHERE fileID IN (
                        SELECT fileID FROM File_Link WHERE newsID = ?
                    )
                ''', (news_id,))
                files_to_delete = [row[0] for row in self.cursor.fetchall()]
                self.cursor.execute('DELETE FROM File_Link WHERE newsID = ?', (news_id,))
                self.cursor.execute('DELETE FROM Files WHERE fileID IN (SELECT fileID FROM File_Link WHERE newsID = ?)', (news_id,))
            else:
                placeholders = ','.join(['?'] * len(all_existing_files))
                self.cursor.execute(f'''
                    SELECT guid FROM Files
                    WHERE fileID IN (
                        SELECT fileID FROM File_Link WHERE newsID = ?
                    )
                    AND guid NOT IN ({placeholders})
                ''', [news_id] + all_existing_files)
                files_to_delete = [row[0] for row in self.cursor.fetchall()]

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

                self.cursor.execute('DELETE FROM File_Link WHERE newsID = ?', (news_id,))
                for guid in all_existing_files:
                    self.cursor.execute('''
                        INSERT INTO File_Link (fileID, newsID)
                        SELECT fileID, ? FROM Files WHERE guid = ?
                    ''', (news_id, guid))

            for img_name in files_to_delete:
                img_path = os.path.join(upload_folder, img_name)
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except Exception as e:
                        print(f"Ошибка удаления файла {img_path}: {str(e)}")

            if files_received and files:
                for file in files:
                    if file.filename:
                        file_guid = str(uuid.uuid4().hex)
                        file_format = file.filename.rsplit('.', 1)[1].lower()
                        file.save(os.path.join(upload_folder, file_guid))
                        
                        self.cursor.execute('''
                            INSERT INTO Files (guid, format)
                            VALUES (?, ?)
                        ''', (file_guid, file_format))
                        
                        self.cursor.execute('''
                            INSERT INTO File_Link (fileID, newsID)
                            VALUES (last_insert_rowid(), ?)
                        ''', (news_id,))

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
            upload_folder = current_app.config['UPLOAD_FOLDER']
            for img_name in files_to_delete:
                img_path = os.path.join(upload_folder, img_name)
                if os.path.isfile(img_path) or os.path.islink(img_path):
                    os.unlink(img_path)

            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def user_get_by_id(self, user_id: int):
        """Get user by ID with basic information"""
        self.cursor.execute('''
            SELECT userID, password, user_role, nick, login
            FROM Users 
            WHERE userID = ?
        ''', (user_id,))
        return self.cursor.fetchone()

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
        if self.cursor.fetchone():
            raise ValueError("Пользователь с таким логином или ником уже существует")

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
            SELECT userID, login, nick, user_role, registration_date 
            FROM Users
            ORDER BY userID
        ''')
        return [dict(row) for row in self.cursor.fetchall()]

    def user_get_all_with_passwords(self) -> list:
        """Get all users with password hashes (for admin only)"""
        self.cursor.execute('''
            SELECT userID, login, nick, user_role, password, registration_date  
            FROM Users
            ORDER BY userID
        ''')
        return [dict(row) for row in self.cursor.fetchall()]
    
    def user_get_all_with_real_passwords(self) -> list:
        """Get all users with real passwords (FOR DEBUG ONLY)"""
        # Только для разработки!
        # В production этот метод должен быть отключен
        self.cursor.execute('''
            SELECT userID, login, nick, user_role, password, real_password, registration_date 
            FROM Users
            ORDER BY userID
        ''')
        return [dict(row) for row in self.cursor.fetchall()]
            
    def user_update(self, user_id, update_data):
        """Обновить данные пользователя"""
        # Проверка существования пользователя
        self.cursor.execute("SELECT 1 FROM Users WHERE userID = ?", (user_id,))
        if not self.cursor.fetchone():
            raise ValueError(f"Пользователь с ID={user_id} не найден")

        allowed_fields = ["nick", "login", "user_role"]
        updates = {k: v for k, v in update_data.items() if k in allowed_fields}

        if not updates:
            raise ValueError("Нет допустимых полей для обновления")

        if "login" in updates:
            self.cursor.execute(
                "SELECT 1 FROM Users WHERE lower(login) = lower(?) AND userID != ?",
                (updates["login"], user_id)
            )
            if self.cursor.fetchone():
                raise ValueError(f"Логин '{updates['login']}' уже используется")
        if "nick" in updates:
            self.cursor.execute(
                "SELECT 1 FROM Users WHERE lower(nick) = lower(?) AND userID != ?",
                (updates["nick"], user_id)
            )
            if self.cursor.fetchone():
                raise ValueError(f"Никнейм '{updates['nick']}' уже используется")


        set_clause = ", ".join([f"{field} = ?" for field in updates.keys()])
        values = list(updates.values()) + [user_id]
        self.cursor.execute(f"UPDATE Users SET {set_clause} WHERE userID = ?", values)
        self.connection.commit()


    def user_delete(self, user_id):
        """Delete user by ID"""
        self.cursor.execute("DELETE FROM Users WHERE userID = ?", (user_id,))
        self.connection.commit()

    def users_delete_all(self, exclude_ids: list):
        try:
            # Находим первого администратора
            self.cursor.execute('''
                SELECT userID FROM Users 
                WHERE user_role = 'Administrator' 
                ORDER BY userID ASC 
                LIMIT 1
            ''')
            first_admin = self.cursor.fetchone()
            
            # Формируем окончательный список исключений
            final_exclude = exclude_ids.copy()
            if first_admin:
                final_exclude.append(first_admin['userID'])
            
            # Удаляем дубликаты
            final_exclude = list(set(final_exclude))
            
            # Если список исключений пуст, добавляем несуществующий ID
            placeholders = ','.join(['?'] * len(final_exclude)) if final_exclude else 'NULL'
            
            # Удаляем всех, кроме исключенных ID
            query = f'''
                DELETE FROM Users 
                WHERE userID NOT IN ({placeholders})
            '''
            self.cursor.execute(query, final_exclude)
            
            self.connection.commit()
            return True
        except Exception as e:
            self.connection.rollback()
            raise e

    # Categories methods
    def category_create(self, name: str, description: str = None) -> int:
        """Создать категорию"""
        if not name.strip():
            raise ValueError("Category name cannot be empty")
        try:
            if self.cursor.fetchone():
                raise ValueError(f"Категория с названием '{name}' уже существует")

            self.cursor.execute('''
                INSERT INTO Categories (name, description, create_date)
                VALUES (?, ?, datetime('now', 'localtime'))
            ''', (name, description))

            self.connection.commit()
            return self.cursor.lastrowid
        except sqlite3.IntegrityError:
            raise ValueError(f"Category '{name}' already exists")

    def category_update(self, category_id: int, name: str, description: str = None):
        """Обновить категорию"""
        # Проверяем существование категории
        self.cursor.execute("SELECT 1 FROM Categories WHERE categoryID = ?", (category_id,))
        if not self.cursor.fetchone():
            raise ValueError(f"Категория с ID={category_id} не найдена")

        # Проверяем уникальность нового названия (без учёта регистра)
        self.cursor.execute('''
            SELECT 1 FROM Categories 
        ''', (name, category_id))
        if self.cursor.fetchone():
            raise ValueError(f"Категория с названием '{name}' уже существует")

        # Выполняем обновление
        self.cursor.execute('''
            UPDATE Categories 
            SET name = ?, description = ?
            WHERE categoryID = ?
        ''', (name, description, category_id))

        if self.cursor.rowcount == 0:
            raise ValueError("Не удалось обновить категорию")

        self.connection.commit()

    def category_delete(self, category_id: int):
        """Удалить категорию"""
        self.cursor.execute('DELETE FROM Categories WHERE categoryID = ?', (category_id,))
        self.connection.commit()

    def category_delete_all(self):
        """Удалить все категории"""
        self.cursor.execute('DELETE FROM Categories')
        self.connection.commit()

    def category_get_all(self) -> list:
        """Получить все категории"""
        self.cursor.execute('SELECT * FROM Categories ORDER BY create_date DESC')
        return [dict(row) for row in self.cursor.fetchall()]
    
    # Удаляем старые методы delete и перерабатываем логику

    def news_soft_delete(self, newsID: int):
        """Мягкое удаление в корзину"""
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            
            # Помечаем новость как удаленную
            self.cursor.execute('''
                UPDATE News 
                SET delete_date = datetime('now', 'localtime') 
                WHERE newsID = ?
            ''', (newsID,))
            
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def news_soft_delete_multiple(self, newsIDs: list):
        """Мягкое удаление нескольких новостей"""
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            
            placeholders = ','.join(['?'] * len(newsIDs))
            self.cursor.execute(f'''
                UPDATE News 
                SET delete_date = datetime('now', 'localtime') 
                WHERE newsID IN ({placeholders})
            ''', newsIDs)
            
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e
        
    def restore_news(self, newsIDs: list):
        """Восстановление новостей из корзины"""
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            
            placeholders = ','.join(['?'] * len(newsIDs))
            self.cursor.execute(f'''
                UPDATE News 
                SET delete_date = NULL 
                WHERE newsID IN ({placeholders})
            ''', newsIDs)
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e
        
    def purge_news(self, newsIDs: list):
        """Окончательное удаление новостей из корзины"""
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            
            # 1. Получаем файлы для удаления
            placeholders = ','.join(['?'] * len(newsIDs))
            self.cursor.execute(f'''
                SELECT f.guid 
                FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID
                WHERE fl.newsID IN ({placeholders})
            ''', newsIDs)
            files_to_delete = [row[0] for row in self.cursor.fetchall()]
            
            # 2. Удаляем новости и связанные данные через CASCADE
            self.cursor.execute(f'''
                DELETE FROM News 
                WHERE newsID IN ({placeholders})
            ''', newsIDs)
            
            # 3. Удаляем файлы физически
            upload_folder = current_app.config['UPLOAD_FOLDER']
            for file_name in files_to_delete:
                file_path = os.path.join(upload_folder, file_name)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        print(f"Ошибка удаления файла {file_path}: {str(e)}")
            
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def purge_expired_news(self, days=30):
        """Очистка старых удаленных новостей"""
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            
            # Получаем новости для удаления
            self.cursor.execute('''
                SELECT newsID 
                FROM News 
                WHERE delete_date <= datetime('now', ?)
            ''', (f'-{days} days',))
            news_ids = [row[0] for row in self.cursor.fetchall()]
            
            if news_ids:
                self.purge_news(news_ids)
            
            self.connection.commit()
            return len(news_ids)
        except Exception as e:
            self.connection.rollback()
            raise e
    
    def get_deleted_news(self) -> list:
        """Get all news items with single query"""
        self.cursor.execute('''
            SELECT 
                n.newsID, 
                n.title, 
                n.description, 
                n.status,
                n.create_date, 
                n.publish_date, 
                n.event_start, 
                n.event_end,
                up.nick AS publisher_nick, 
                um.nick AS moderator_nick,
                c.name AS category_name,
                n.delete_date 
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            LEFT JOIN Categories c ON c.categoryID = n.categoryID
            WHERE n.delete_date IS NOT NULL
            GROUP BY n.newsID
            ORDER BY n.delete_date DESC
        ''')
        
        news_items = []
        for row in self.cursor.fetchall():
            news_id = row['newsID']
            
            # Get files
            self.cursor.execute('''
                SELECT f.fileID, guid, format 
                FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID
                WHERE fl.newsID = ?
                ORDER BY f.fileID ASC
            ''', (news_id,))
            
            files = [{
                'fileID': r['fileID'],
                'fileName': r['guid'],
                'fileFormat': r['format']
            } for r in self.cursor.fetchall()]
            
            news_items.append({
                'newsID': news_id,
                'title': row['title'],
                'description': row['description'],
                'status': row['status'],
                'create_date': row['create_date'],
                'publish_date': row['publish_date'],
                'event_start': row['event_start'],
                'event_end': row['event_end'],
                'publisher_nick': row['publisher_nick'],
                'moderator_nick': row['moderator_nick'],
                'category_name': row['category_name'],
                'delete_date': row['delete_date'],
                'files': files
            })
        
        return news_items

    def get_deleted_news_single(self, news_id):
        """Получает одну новость из корзины"""
        self.cursor.execute('''
            SELECT * FROM News 
            WHERE newsID = ? AND delete_date IS NOT NULL
        ''', (news_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None
    

    def get_pending_news(self) -> list:
        """
        Возвращает список всех новостей со статусом 'Pending' и delete_date IS NULL.
        Для каждой новости формирует вложенный список файлов (если они есть).
        """
        try:
            # 1) Выполняем SQL-запрос, сразу отфильтровав удалённые записи
            self.cursor.execute('''
                SELECT 
                    n.newsID,
                    n.title,
                    n.description,
                    n.status,
                    n.create_date,
                    n.event_start,
                    n.event_end,
                    up.nick AS publisher_nick,
                    f.fileID,
                    f.guid,
                    f.format
                FROM News n
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN File_Link fl ON fl.newsID = n.newsID
                LEFT JOIN Files f ON f.fileID = fl.fileID
                WHERE n.status = 'Pending'
                  AND n.delete_date IS NULL
                ORDER BY n.create_date DESC
            ''')
            
            rows = self.cursor.fetchall()
            pending_dict = {}

            # 2) Группируем результаты по newsID, собирая файлы в список
            for row in rows:
                news_id = row['newsID']

                # Если новости с таким ID ещё нет в словаре — создаём её
                if news_id not in pending_dict:
                    pending_dict[news_id] = {
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
                
                # Если для этой новости есть файл — добавляем в массив
                if row['fileID'] is not None:
                    pending_dict[news_id]['files'].append({
                        'fileID': row['fileID'],
                        'fileName': row['guid'],
                        'fileFormat': row['format']
                    })

            # 3) Возвращаем список словарей, убрав промежуточный dict
            return list(pending_dict.values())

        except sqlite3.OperationalError as e:
            raise sqlite3.DatabaseError(
                "Ошибка получения списка ожидающих модерацию новостей",
                details={
                    "operation": "get_pending_news",
                    "error": str(e)
                }
            ) from e