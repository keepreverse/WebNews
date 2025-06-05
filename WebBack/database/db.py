import os
import uuid
import sqlite3
from flask import current_app
from werkzeug.security import generate_password_hash
from enums import InvalidValues

class Storage(object):

    def __init__(self):
        self.connection = None
        self.cursor = None
        # Путь к БД
        self.db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'storage.db')

    # -------------------------------
    # Работа с соединением

    def open_connection(self):
        """Открыть соединение к базе (с WAL и row_factory)."""
        if self.connection is None:
            self.connection = sqlite3.connect(
                self.db_path,
                timeout=10,
                check_same_thread=False
            )
            self.connection.row_factory = sqlite3.Row
            self.cursor = self.connection.cursor()
            self.cursor.execute('PRAGMA foreign_keys = ON;')
            self.cursor.execute('PRAGMA journal_mode=WAL')

            self._create_tables()
            self._create_indexes()
            self._create_triggers()
            self.connection.commit()

    def close_connection(self):
        """Закрыть соединение к базе, если оно открыто."""
        if self.connection:
            try:
                self.connection.close()
            except:
                pass
            finally:
                self.connection = None
                self.cursor = None

    def _create_tables(self):
        """Создать необходимые таблицы (если их ещё нет)."""
        try:
            # 1) Таблица Users
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

            # 2) Таблица News
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
                    archive_date TEXT,
                    categoryID INTEGER,
                    FOREIGN KEY (publisherID) REFERENCES Users(userID) ON DELETE CASCADE,
                    FOREIGN KEY (moderated_byID) REFERENCES Users(userID) ON DELETE SET NULL,
                    FOREIGN KEY (categoryID) REFERENCES Categories(categoryID) ON DELETE SET NULL
                )
            ''')

            # 3) Таблица Files
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS Files (
                    fileID INTEGER PRIMARY KEY AUTOINCREMENT,
                    guid TEXT NOT NULL,
                    format TEXT NOT NULL
                )
            ''')

            # 4) Таблица File_Link (связь Files ↔ News)
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS File_Link (
                    file_linkID INTEGER PRIMARY KEY AUTOINCREMENT,
                    fileID INTEGER NOT NULL,
                    newsID INTEGER NOT NULL,
                    FOREIGN KEY (fileID) REFERENCES Files(fileID) ON DELETE CASCADE,
                    FOREIGN KEY (newsID) REFERENCES News(newsID) ON DELETE CASCADE
                )
            ''')

            # 5) Таблица Categories
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
            print(f"Ошибка создания таблиц: {e}")

    def _create_indexes(self):
        """Создать индексы для оптимизации поиска."""
        try:
            # Users
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nick_nocase ON Users(nick COLLATE NOCASE)')
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_nocase ON Users(login COLLATE NOCASE)')

            # News
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_publisher ON News(publisherID)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_status ON News(status)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_create_date ON News(create_date)')
            self.cursor.execute('CREATE INDEX IF NOT EXISTS idx_news_archive_date ON News(archive_date)')

            # Files
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_files_guid ON Files(guid)')

            # Categories
            self.cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_nocase ON Categories(name COLLATE NOCASE)')

            self.connection.commit()
        except sqlite3.OperationalError as e:
            print(f"Ошибка создания индексов: {e}")

    def _create_triggers(self):
        """Создать триггеры для автоматических дат."""
        try:
            # 1) При вставке в Users, если registration_date пуст, установить текущую дату
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

            # 2) При вставке в News проверяем: if event_end не NULL и event_start > event_end – abort
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS validate_event_dates
                BEFORE INSERT ON News
                FOR EACH ROW
                WHEN NEW.event_end IS NOT NULL AND NEW.event_start > NEW.event_end
                BEGIN
                    SELECT RAISE(ABORT, 'event_start must be <= event_end');
                END;
            ''')

            # 3) При изменении status → 'Approved' ставим publish_date
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS update_publish_date
                AFTER UPDATE OF status ON News
                FOR EACH ROW
                WHEN NEW.status = 'Approved' AND OLD.status != 'Approved'
                BEGIN
                    UPDATE News
                    SET publish_date = datetime('now', 'localtime')
                    WHERE newsID = NEW.newsID;
                END;
            ''')


            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS delete_news_files
                BEFORE DELETE ON News
                FOR EACH ROW
                BEGIN
                    DELETE FROM Files
                    WHERE fileID IN (
                        SELECT fileID FROM File_Link WHERE newsID = OLD.newsID
                    );
                    DELETE FROM File_Link WHERE newsID = OLD.newsID;
                END;
            ''')

            # 5) При удалении категории сбрасываем categoryID у новостей
            self.cursor.execute('''
                CREATE TRIGGER IF NOT EXISTS reset_category_on_delete
                AFTER DELETE ON Categories
                FOR EACH ROW
                BEGIN
                    UPDATE News
                    SET categoryID = NULL
                    WHERE categoryID = OLD.categoryID;
                END;
            ''')

            self.connection.commit()
        except sqlite3.OperationalError as e:
            print(f"Ошибка создания триггеров: {e}")

    # -------------------------------
    # Методы для работы с News

    def news_add(self, user_id, news_input_data, files_received, files_list, files_folder):
        """Добавление новой новости."""
        self.cursor.execute('BEGIN TRANSACTION;')

        # 1) Если переданы файлы, сразу сохраняем их в Files
        if files_received:
            for file in files_list:
                file_guid = str(uuid.uuid4().hex)
                file_format = file.filename.rsplit('.', 1)[1].lower()
                file.save(os.path.join(files_folder, file_guid))

                self.cursor.execute('''
                    INSERT INTO Files (guid, format)
                    VALUES (?, ?)
                ''', (file_guid, file_format))

        # 2) Вставляем запись в News (status = Pending by default)
        self.cursor.execute('''
            INSERT INTO News (
                publisherID,
                title,
                description,
                status,
                event_start,
                event_end,
                create_date,
                categoryID
            ) VALUES (
                ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?
            )
        ''', (
            user_id,
            news_input_data.get("title"),
            news_input_data.get("description"),
            news_input_data.get("status", "Pending"),
            news_input_data.get("event_start"),
            news_input_data.get("event_end"),
            news_input_data.get("categoryID")
        ))

        # 3) Привязка файлов к этой новости (если были)
        if files_received:
            news_id = self.cursor.lastrowid
            for i in range(len(files_list)):
                # берем последний INSERT INTO Files, OFFSET по i (в том порядке, в котором они вставлялись)
                self.cursor.execute('''
                    INSERT INTO File_Link (fileID, newsID)
                    VALUES (
                        (SELECT fileID FROM Files ORDER BY fileID DESC LIMIT 1 OFFSET ?),
                        ?
                    )
                ''', (i, news_id))

        self.connection.commit()

    def get_news(self) -> list:
        """Получить все «неудалённые» новости (delete_date IS NULL)."""
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
                    up.nick   AS publisher_nick,
                    um.nick   AS moderator_nick,
                    c.name    AS category_name,
                    n.archive_date
                FROM News n
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN Users um ON um.userID = n.moderated_byID
                LEFT JOIN Categories c ON c.categoryID = n.categoryID
                WHERE n.delete_date IS NULL
                ORDER BY n.create_date DESC
            ''')

            news_items = []
            for row in self.cursor.fetchall():
                nid = row['newsID']
                # Получаем список файлов
                self.cursor.execute('''
                    SELECT f.fileID, guid, format
                    FROM Files f
                    JOIN File_Link fl ON fl.fileID = f.fileID
                    WHERE fl.newsID = ?
                    ORDER BY f.fileID ASC
                ''', (nid,))
                files = [{
                    'fileID':    r['fileID'],
                    'fileName':  r['guid'],
                    'fileFormat':r['format']
                } for r in self.cursor.fetchall()]

                news_items.append({
                    'newsID':         nid,
                    'title':          row['title'],
                    'description':    row['description'],
                    'status':         row['status'],
                    'create_date':    row['create_date'],
                    'publish_date':   row['publish_date'],
                    'event_start':    row['event_start'],
                    'event_end':      row['event_end'],
                    'publisher_nick': row['publisher_nick'],
                    'moderator_nick': row['moderator_nick'],
                    'category_name':  row['category_name'],
                    'archive_date':   row['archive_date'],
                    'files':          files
                })
            return news_items

        except sqlite3.OperationalError as e:
            raise Exception("Ошибка базы данных. Попробуйте позже") from e
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise Exception("Такая запись уже существует")

    def get_news_single(self, newsID: int) -> list:
        """
        Получить одну новость по ID (если delete_date IS NULL).
        Возвращает [ {данные}, newsID ] или [{}, INVALID_ID].
        """
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
                up.nick   AS publisher_nick,
                um.nick   AS moderator_nick,
                c.name    AS category_name,
                n.categoryID,
                n.archive_date
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

        # Сбор файлов
        self.cursor.execute('''
            SELECT f.fileID, guid, format
            FROM Files f
            JOIN File_Link fl ON fl.fileID = f.fileID
            WHERE fl.newsID = ?
            ORDER BY f.fileID ASC
        ''', (newsID,))

        files = [{
            'fileID':    row['fileID'],
            'fileName':  row['guid'],
            'fileFormat':row['format']
        } for row in self.cursor.fetchall()]

        return [{
            'newsID':         news_data['newsID'],
            'title':          news_data['title'],
            'description':    news_data['description'],
            'status':         news_data['status'],
            'create_date':    news_data['create_date'],
            'publish_date':   news_data['publish_date'],
            'event_start':    news_data['event_start'],
            'event_end':      news_data['event_end'],
            'publisher_nick': news_data['publisher_nick'],
            'moderator_nick': news_data['moderator_nick'],
            'categoryID':     news_data['categoryID'],
            'category_name':  news_data['category_name'],
            'archive_date':   news_data['archive_date'],
            'files':          files
        }, news_data['newsID']]

    def news_update(self, news_id, user_id, news_data, files_received, files, upload_folder, existing_files=None, status_override=None):
        """
        Обновить новость; если передан status_override:
        - 'Archived'  → status='Archived', archive_date=now
        - любое другое значение → сброс archive_date
        При этом поддерживаются все комбинации работы с фотографиями:
        - полностью удалить все старые фотографии,
        - частично удалить некоторые,
        - заменить/добавить новые,
        - оставить прежние.
        Входные параметры:
        • news_data          — dict из request.form (включая ключ delete_all_files при необходимости)
        • existing_files     — list[guid] старых фотографий, которые нужно оставить (если фронтенд их передал)
        • files_received     — булево, указывает, пришли ли новые файлы (обычно bool(files))
        • files              — list объектов FileStorage новых загруженных файлов
        • upload_folder      — путь к каталогу для сохранения файлов
        """
        self.cursor.execute('BEGIN TRANSACTION;')
        try:
            # --------------------------
            # 1. Обновляем саму запись News
            # --------------------------
            update_query = """
                UPDATE News
                SET title = ?, description = ?, event_start = ?, event_end = ?, publisherID = ?, categoryID = ?
            """
            update_values = [
                news_data.get('title'),
                news_data.get('description'),
                news_data.get('event_start'),
                news_data.get('event_end'),
                user_id,
                news_data.get('categoryID')
            ]

            if status_override:
                if status_override == 'Archived':
                    update_query += ", status = ?, archive_date = datetime('now', 'localtime')"
                    update_values.append(status_override)
                else:
                    update_query += ", status = ?, archive_date = NULL"
                    update_values.append(status_override)

            update_query += " WHERE newsID = ?"
            update_values.append(news_id)
            self.cursor.execute(update_query, tuple(update_values))

            # --------------------------
            # 2. Работа с файлами
            # --------------------------

            # • existing_files — list[guid] тех файлов, которые фронтенд хочет оставить.
            #   Если в news_data есть флаг delete_all_files == "true", это означает, что
            #   пользователь явно попросил удалить все старые файлы.
            # • files_received  — True, если пришли какие-то новые файлы (files != []).
            # • files           — list объектов FileStorage с новыми файлами.

            # Определим список GUID тех старых фотографий, которые нужно оставить.
            keep_guids = []
            if news_data.get('delete_all_files') == "true":
                # Явное удаление всех старых файлов  → keep_guids остаётся пустым
                keep_guids = []
            elif existing_files is not None:
                # existing_files может быть [] или непустым списком
                keep_guids = existing_files
            else:
                # Если фронтенд не передал existing_files вовсе → считаем, что не меняем старые.
                # Поэтому получим все старые guids, чтобы их сохранить.
                self.cursor.execute("""
                    SELECT f.guid
                    FROM Files f
                    JOIN File_Link fl ON fl.fileID = f.fileID
                    WHERE fl.newsID = ?
                """, (news_id,))
                rows_all = self.cursor.fetchall()
                keep_guids = [r['guid'] for r in rows_all]

            # 2.1. Получим полную карту {guid: fileID} для всех старых файлов, связанных с этим newsID
            self.cursor.execute("""
                SELECT f.fileID, f.guid
                FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID
                WHERE fl.newsID = ?
            """, (news_id,))
            rows = self.cursor.fetchall()
            old_map = {r['guid']: r['fileID'] for r in rows}  # guid → fileID

            # 2.2. Определим guids и fileIDs для удаления: 
            #     все старые, которых нет в keep_guids
            to_delete_guids = [g for g in old_map.keys() if g not in keep_guids]
            to_delete_file_ids = [old_map[g] for g in to_delete_guids]

            # 2.3. Удаляем связи File_Link и сами записи Files для этих fileIDs
            if to_delete_file_ids:
                placeholders_db = ','.join(['?'] * len(to_delete_file_ids))
                # Сначала удалить связи
                self.cursor.execute(
                    f"DELETE FROM File_Link WHERE fileID IN ({placeholders_db}) AND newsID = ?",
                    tuple(to_delete_file_ids) + (news_id,)
                )
                # Затем удалить записи из Files
                self.cursor.execute(
                    f"DELETE FROM Files WHERE fileID IN ({placeholders_db})",
                    tuple(to_delete_file_ids)
                )

            # 2.4. Физически удаляем файлы с диска
            for guid in to_delete_guids:
                img_path = os.path.join(upload_folder, guid)
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except Exception as e:
                        print(f"Ошибка удаления файла {img_path}: {e}")

            # 2.5. Теперь (если нужно) сохраняем новые файлы, пришедшие в параметре files
            if files_received and files:
                for file in files:
                    if not file.filename:
                        continue
                    # Генерируем новый уникальный guid
                    new_guid = str(uuid.uuid4().hex)
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    # Сохраняем файл на диск
                    file.save(os.path.join(upload_folder, new_guid))
                    # Вставляем запись в Files
                    self.cursor.execute(
                        "INSERT INTO Files (guid, format) VALUES (?, ?)",
                        (new_guid, ext)
                    )
                    # Получаем fileID последней вставленной записи
                    new_file_id = self.cursor.lastrowid
                    # Вставляем связь (fileID ↔ newsID)
                    self.cursor.execute(
                        "INSERT INTO File_Link (fileID, newsID) VALUES (?, ?)",
                        (new_file_id, news_id)
                    )

            # 2.6. Для тех guids, которые мы хотим сохранить (keep_guids),
            #      убедимся, что связи в File_Link существуют. Если уже были —
            #      ничего не меняем. Если вдруг удалились (в редких случаях) —
            #      восстанавливаем.
            for guid in keep_guids:
                fid = old_map.get(guid)
                if fid:
                    # Проверим, существует ли связь
                    self.cursor.execute(
                        "SELECT 1 FROM File_Link WHERE fileID = ? AND newsID = ?",
                        (fid, news_id)
                    )
                    if not self.cursor.fetchone():
                        # Вставим связь заново
                        self.cursor.execute(
                            "INSERT INTO File_Link (fileID, newsID) VALUES (?, ?)",
                            (fid, news_id)
                        )

            # --------------------------
            # 3. Фиксируем транзакцию
            # --------------------------
            self.connection.commit()

        except Exception as e:
            # При любой ошибке возвращаем БД в прежнее состояние
            self.connection.rollback()
            raise e

    # -------------------------------
    # Методы для юзеров (Users)

    def user_get_by_token(self, token):
        self.cursor.execute('''SELECT userID, password, user_role FROM Users WHERE auth_token = ?''', (token,))
        return self.cursor.fetchone()

    def user_set_token(self, user_id, token):
        self.cursor.execute('''UPDATE Users SET auth_token = ? WHERE userID = ?''', (token, user_id))
        self.connection.commit()

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

    # -------------------------------
    # Методы для категорий (Categories)

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

    # -------------------------------
    # Методы для корзины (Trash / Soft Delete)

    def news_soft_delete(self, newsID: int):
        """
        Мягкое удаление: 
        ● Помечает delete_date = now, 
        ● Очищает archive_date и publish_date,
        ● Статус при этом остаётся прежним (чаще всего 'Approved' или 'Archived').
        """
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            self.cursor.execute('''
                UPDATE News
                SET delete_date = datetime('now', 'localtime'),
                    archive_date = NULL,
                    publish_date = NULL
                WHERE newsID = ?
            ''', (newsID,))
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def news_soft_delete_multiple(self, newsIDs: list):
        """Мягкое удаление сразу нескольких новостей."""
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            placeholders = ','.join(['?'] * len(newsIDs))
            self.cursor.execute(f'''
                UPDATE News
                SET delete_date = datetime('now', 'localtime'),
                    archive_date = NULL,
                    publish_date = NULL
                WHERE newsID IN ({placeholders})
            ''', newsIDs)
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def restore_news(self, newsIDs: list):
        """
        Восстановление новостей из корзины:
        ● Сбрасываем delete_date,
        ● Очищаем archive_date и publish_date,
        ● Переводим статус → 'Pending' (чтобы новость шла повторно на модерацию).
        """
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
            placeholders = ','.join(['?'] * len(newsIDs))
            self.cursor.execute(f'''
                UPDATE News
                SET delete_date = NULL,
                    archive_date = NULL,
                    publish_date = NULL,
                    status = 'Pending'
                WHERE newsID IN ({placeholders})
            ''', newsIDs)
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def purge_news(self, newsIDs: list):
        """
        Окончательное удаление новостей:
        ● Сначала собираем все файлы (guid) для удаления из ФС,
        ● Удаляем записи в News (CASCADE по File_Link → Files),
        ● Затем удаляем файлы с диска.
        """
        try:
            self.cursor.execute('BEGIN TRANSACTION;')

            placeholders = ','.join(['?'] * len(newsIDs))
            # Сбор guid всех файлов для удаления из ФС
            self.cursor.execute(f'''
                SELECT f.guid
                FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID
                WHERE fl.newsID IN ({placeholders})
            ''', newsIDs)
            files_to_delete = [row[0] for row in self.cursor.fetchall()]

            # Удаляем сами новости (и связанные через FK)
            self.cursor.execute(f'''
                DELETE FROM News
                WHERE newsID IN ({placeholders})
            ''', newsIDs)

            # Физически удаляем файлы с диска
            upload_folder = current_app.config['UPLOAD_FOLDER']
            for fname in files_to_delete:
                file_path = os.path.join(upload_folder, fname)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        print(f"Ошибка удаления файла {file_path}: {e}")

            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e

    def purge_expired_news(self, days=30):
        """
        Удаляет из корзины новости, 
        у которых delete_date старее, чем now - days.
        """
        try:
            self.cursor.execute('BEGIN TRANSACTION;')
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
        """
        Возвращает список всех «удалённых» (в корзине) новостей:
        WHERE delete_date IS NOT NULL
        """
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
                up.nick   AS publisher_nick,
                um.nick   AS moderator_nick,
                c.name    AS category_name,
                n.delete_date
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            LEFT JOIN Categories c ON c.categoryID = n.categoryID
            WHERE n.delete_date IS NOT NULL
            ORDER BY n.delete_date DESC
        ''')

        news_items = []
        for row in self.cursor.fetchall():
            nid = row['newsID']
            self.cursor.execute('''
                SELECT f.fileID, guid, format
                FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID
                WHERE fl.newsID = ?
                ORDER BY f.fileID ASC
            ''', (nid,))
            files = [{
                'fileID':    r['fileID'],
                'fileName':  r['guid'],
                'fileFormat':r['format']
            } for r in self.cursor.fetchall()]

            news_items.append({
                'newsID':         nid,
                'title':          row['title'],
                'description':    row['description'],
                'status':         row['status'],
                'create_date':    row['create_date'],
                'publish_date':   row['publish_date'],
                'event_start':    row['event_start'],
                'event_end':      row['event_end'],
                'publisher_nick': row['publisher_nick'],
                'moderator_nick': row['moderator_nick'],
                'category_name':  row['category_name'],
                'delete_date':    row['delete_date'],
                'files':          files
            })
        return news_items

    def get_deleted_news_single(self, news_id):
        """Получить одну «удалённую» новость (delete_date IS NOT NULL)."""
        self.cursor.execute('''
            SELECT * FROM News
            WHERE newsID = ? AND delete_date IS NOT NULL
        ''', (news_id,))
        row = self.cursor.fetchone()
        return dict(row) if row else None

    def get_pending_news(self) -> list:
        """
        Возвращает список всех новостей со статусом 'Pending' и delete_date IS NULL.
        Формат: {newsID, title, description, status, create_date, event_start, event_end, 
                publisher_nick, category_name, files: [...]}
        """
        try:
            self.cursor.execute('''
                SELECT
                    n.newsID,
                    n.title,
                    n.description,
                    n.status,
                    n.create_date,
                    n.event_start,
                    n.event_end,
                    up.nick   AS publisher_nick,
                    c.name    AS category_name
                FROM News n
                JOIN Users up ON up.userID = n.publisherID
                LEFT JOIN Categories c ON c.categoryID = n.categoryID
                WHERE n.status = 'Pending'
                AND n.delete_date IS NULL
                ORDER BY n.create_date DESC
            ''')

            pending_items = []
            for row in self.cursor.fetchall():
                nid = row['newsID']
                # Получаем список файлов
                self.cursor.execute('''
                    SELECT f.fileID, guid, format
                    FROM Files f
                    JOIN File_Link fl ON fl.fileID = f.fileID
                    WHERE fl.newsID = ?
                    ORDER BY f.fileID ASC
                ''', (nid,))
                files = [{
                    'fileID':    r['fileID'],
                    'fileName':  r['guid'],
                    'fileFormat': r['format']
                } for r in self.cursor.fetchall()]

                pending_items.append({
                    'newsID':         nid,
                    'title':         row['title'],
                    'description':    row['description'],
                    'status':         row['status'],
                    'create_date':    row['create_date'],
                    'event_start':    row['event_start'],
                    'event_end':      row['event_end'],
                    'publisher_nick': row['publisher_nick'],
                    'category_name':  row['category_name'],
                    'files':          files
                })
            return pending_items

        except sqlite3.OperationalError as e:
            raise sqlite3.DatabaseError(
                "Ошибка получения списка ожидающих модерацию новостей",
                details={
                    "operation": "get_pending_news",
                    "error":     str(e)
                }
            ) from e

    def get_archived_news(self) -> list:
        """
        Возвращает список всех «архивных» новостей:
        WHERE status = 'Archived' AND delete_date IS NULL AND archive_date IS NOT NULL
        """
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
                up.nick    AS publisher_nick,
                um.nick    AS moderator_nick,
                c.name     AS category_name,
                n.archive_date
            FROM News n
            JOIN Users up ON up.userID = n.publisherID
            LEFT JOIN Users um ON um.userID = n.moderated_byID
            LEFT JOIN Categories c ON c.categoryID = n.categoryID
            WHERE n.status = 'Archived'
              AND n.archive_date IS NOT NULL
              AND n.delete_date IS NULL
            ORDER BY n.archive_date DESC
        ''')

        archived_items = []
        for row in self.cursor.fetchall():
            nid = row['newsID']
            self.cursor.execute('''
                SELECT
                    f.fileID,
                    guid AS fileName,
                    format AS fileFormat
                FROM Files f
                JOIN File_Link fl ON fl.fileID = f.fileID
                WHERE fl.newsID = ?
                ORDER BY f.fileID ASC
            ''', (nid,))
            files = [{
                'fileID':    r['fileID'],
                'fileName':  r['fileName'],
                'fileFormat':r['fileFormat']
            } for r in self.cursor.fetchall()]

            archived_items.append({
                'newsID':         nid,
                'title':          row['title'],
                'description':    row['description'],
                'status':         row['status'],
                'create_date':    row['create_date'],
                'publish_date':   row['publish_date'],
                'event_start':    row['event_start'],
                'event_end':      row['event_end'],
                'archive_date':   row['archive_date'],
                'publisher_nick': row['publisher_nick'],
                'moderator_nick': row['moderator_nick'],
                'category_name':  row['category_name'],
                'files':          files
            })
        return archived_items


    # -------------------------------
    # Методы для обновления вкладок админки (Real-time AdminPanel Tabs Updates)

    def count_pending_news(self) -> int:
        """
        Возвращает количество новостей со статусом 'Pending' и delete_date IS NULL.
        """
        try:
            self.cursor.execute('''
                SELECT COUNT(*) as cnt
                FROM News
                WHERE status = 'Pending'
                  AND delete_date IS NULL
            ''')
            row = self.cursor.fetchone()
            return row['cnt'] if row else 0
        except sqlite3.OperationalError as e:
            # Можно логировать e, но поднять более общее исключение
            raise sqlite3.DatabaseError(
                "Ошибка подсчёта ожидающих модерацию новостей",
                details={"operation": "count_pending_news", "error": str(e)}
            ) from e

    def count_trash_news(self) -> int:
        """
        Возвращает количество новостей, находящихся в корзине (delete_date IS NOT NULL).
        """
        try:
            self.cursor.execute('''
                SELECT COUNT(*) as cnt
                FROM News
                WHERE delete_date IS NOT NULL
            ''')
            row = self.cursor.fetchone()
            return row['cnt'] if row else 0
        except sqlite3.OperationalError as e:
            raise sqlite3.DatabaseError(
                "Ошибка подсчёта новостей в корзине",
                details={"operation": "count_trash_news", "error": str(e)}
            ) from e

    def count_archived_news(self) -> int:
        """
        Возвращает количество архива новостей (status = 'Archived' и delete_date IS NULL).
        """
        try:
            self.cursor.execute('''
                SELECT COUNT(*) as cnt
                FROM News
                WHERE status = 'Archived'
                  AND archive_date IS NOT NULL
                  AND delete_date IS NULL
            ''')
            row = self.cursor.fetchone()
            return row['cnt'] if row else 0
        except sqlite3.OperationalError as e:
            raise sqlite3.DatabaseError(
                "Ошибка подсчёта новостей в архиве",
                details={"operation": "count_archived_news", "error": str(e)}
            ) from e
