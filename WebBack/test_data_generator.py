import random
import os
import time
from datetime import datetime, timedelta
from faker import Faker
from database.db import Storage
from config import DATABASE_PATH

fake = Faker("ru_RU")

NEWS_STATUSES = ["Pending", "Approved", "Rejected", "Archived"]
USER_ROLES = ["Administrator", "Moderator", "Publisher"]

def get_db_size():
    try:
        return os.path.getsize(DATABASE_PATH)
    except Exception:
        return 0

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def random_date(start_days_ago=-100, end_days_forward=100):
    start = datetime.now() + timedelta(days=random.randint(start_days_ago, end_days_forward))
    return start.strftime("%Y-%m-%d %H:%M:%S")

class TestDataGenerator:
    def __init__(self):
        self.db = Storage(db_path=DATABASE_PATH)
        self.db.open_connection()
        self.generated_data = {
            "users": [],
            "categories": [],
            "admins": [],
            "moderators": [],
            "publishers": [],
        }
        self.stats = {
            "users_success": 0,
            "users_fail": 0,
            "categories_success": 0,
            "categories_fail": 0,
            "news_success": 0,
            "news_fail": 0,
        }

    def generate_users(self, count: int = 5):
        existing = set()
        for u in self.db.user_get_all():
            existing.add((u["login"].lower(), u["nick"].lower()))

        for _ in range(count):
            while True:
                login = f"{fake.user_name()}{random.randint(1000, 9999)}"
                nick = f"{fake.first_name()}{random.randint(1000, 9999)}"
                if (login.lower(), nick.lower()) not in existing:
                    break

            password = fake.password(length=12)
            role = random.choice(USER_ROLES)
            try:
                user_id = self.db.user_create(
                    login=login,
                    password=password,
                    nickname=nick,
                    role=role,
                )
                self.generated_data["users"].append(user_id)
                if role == "Administrator":
                    self.generated_data["admins"].append(user_id)
                elif role == "Moderator":
                    self.generated_data["moderators"].append(user_id)
                else:
                    self.generated_data["publishers"].append(user_id)
                existing.add((login.lower(), nick.lower()))
                self.stats["users_success"] += 1
                log(f"+ Пользователь: login='{login}', nick='{nick}', role='{role}'")
            except Exception as e:
                self.stats["users_fail"] += 1
                log(f"! Ошибка создания пользователя ({login}): {e}")

    def generate_categories(self, count: int = 5):
        existing = set(c["name"].lower() for c in self.db.category_get_all())
        for _ in range(count):
            name = f"{fake.word().capitalize()}{random.randint(1000, 9999)}"
            while name.lower() in existing:
                name = f"{fake.word().capitalize()}{random.randint(1000, 9999)}"
            description = fake.sentence()
            try:
                category_id = self.db.category_create(name=name, description=description)
                self.generated_data["categories"].append(category_id)
                existing.add(name.lower())
                self.stats["categories_success"] += 1
                log(f"+ Категория: name='{name}'")
            except Exception as e:
                self.stats["categories_fail"] += 1
                log(f"! Ошибка создания категории ({name}): {e}")

    def generate_news(self, count: int = 20):
        if not self.generated_data["users"]:
            raise RuntimeError("Сначала вызовите generate_users(), иначе новости не будут иметь автора.")
        if not self.generated_data["categories"]:
            raise RuntimeError("Сначала вызовите generate_categories(), иначе у новостей не будет категории.")

        for _ in range(count):
            status = random.choice(NEWS_STATUSES)
            publisher_id = random.choice(self.generated_data["users"])
            category_id = random.choice(self.generated_data["categories"])
            event_start_dt = fake.date_time_between(start_date="-100d", end_date="+10d")
            event_end_dt = event_start_dt + timedelta(hours=random.randint(1, 72))

            news_data = {
                "title": fake.sentence(nb_words=6),
                "description": fake.text(max_nb_chars=500),
                "status": status,
                "event_start": event_start_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "event_end": event_end_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "categoryID": category_id,
            }

            moderated_by_id = None
            if status in ("Approved", "Rejected", "Archived") and self.generated_data["moderators"]:
                moderated_by_id = random.choice(self.generated_data["moderators"])

            archive_date = None
            delete_date = None
            publish_date = None
            if status == "Archived":
                archive_date = random_date(-30, 0)
            if random.random() < 0.07:  # ~7% помечены как удалённые
                delete_date = random_date(-15, 0)
            if status == "Approved":
                publish_date = random_date(-25, 0)

            sql = '''
            INSERT INTO News (
                publisherID, moderated_byID, title, description, status,
                event_start, event_end, publish_date, create_date,
                delete_date, archive_date, categoryID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?)
            '''
            try:
                self.db.cursor.execute(sql, (
                    publisher_id, moderated_by_id, news_data["title"], news_data["description"],
                    news_data["status"], news_data["event_start"], news_data["event_end"],
                    publish_date, delete_date, archive_date, news_data["categoryID"]
                ))
                self.stats["news_success"] += 1
                log(f"+ Новость: '{news_data['title']}' (status={status}, publisher_id={publisher_id}, moderated_by={moderated_by_id})")
            except Exception as e:
                self.stats["news_fail"] += 1
                log(f"! Ошибка создания новости ('{news_data['title']}'): {e}")
        self.db.connection.commit()

    def close(self):
        self.db.close_connection()


if __name__ == "__main__":
    size_before = get_db_size()
    log(f"Размер базы данных до генерации: {size_before / (1024*1024):.2f} МБ")

    generator = TestDataGenerator()

    start = time.perf_counter()
    generator.generate_users(count=250)
    generator.generate_categories(count=500)
    generator.generate_news(count=15000)
    end = time.perf_counter()

    # Принудительное завершение WAL и сброс на диск
    generator.db.cursor.execute("PRAGMA wal_checkpoint(FULL);")
    generator.db.connection.commit()
    generator.close()

    size_after = os.path.getsize(DATABASE_PATH)


    print("\n" + "="*40)
    print("ИТОГОВАЯ СТАТИСТИКА ГЕНЕРАЦИИ ДАННЫХ")
    print("="*40)

    print("\n[Пользователи]")
    print(f"{'Успешно создано:':25} {generator.stats['users_success']}")
    print(f"{'Ошибок при создании:':25} {generator.stats['users_fail']}")

    print("\n[Категории]")
    print(f"{'Успешно создано:':25} {generator.stats['categories_success']}")
    print(f"{'Ошибок при создании:':25} {generator.stats['categories_fail']}")

    print("\n[Новости]")
    print(f"{'Успешно создано:':25} {generator.stats['news_success']}")
    print(f"{'Ошибок при создании:':25} {generator.stats['news_fail']}")

    print("\n[Производительность]")
    print(f"{'Время генерации:':25} {end - start:.2f} секунд")

    print(f"\nРазмер БД до генерации:")
    print(f"  - КБ:                                {size_before / 1024:.2f} КБ")
    print(f"  - МБ:                                {size_before / (1024*1024):.3f} МБ")

    print(f"\nРазмер БД после генерации:")
    print(f"  - КБ:                                {size_after / 1024:.2f} КБ")
    print(f"  - МБ:                                {size_after / (1024*1024):.3f} МБ")

    print(f"\nПрирост размера БД:")
    print(f"  - КБ:                                {(size_after - size_before) / 1024:.2f} КБ")
    print(f"  - МБ:                                {(size_after - size_before) / (1024*1024):.4f} МБ")

    print("="*50 + "\n")