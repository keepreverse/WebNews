import random
import os
from datetime import timedelta
from faker import Faker
from database.db import Storage

fake = Faker("ru_RU")


class TestDataGenerator:
    def __init__(self):
        self.db = Storage()
        self.db.open_connection()
        self.generated_data = {
            "users": [],
            "categories": [],
        }

    def generate_users(self, count: int = 5):
        roles = ["Administrator", "Moderator", "Publisher"]

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
            role = random.choice(roles)
            try:
                user_id = self.db.user_create(
                    login=login,
                    password=password,
                    nickname=nick,
                    role=role,
                )
                self.generated_data["users"].append(user_id)
                existing.add((login.lower(), nick.lower()))
                print(f"Создан пользователь: login='{login}', nick='{nick}', role='{role}'")
            except Exception as e:
                print(f"Ошибка создания пользователя ({login}): {e}")

    def generate_categories(self, count: int = 5):
        existing = set(c["name"].lower() for c in self.db.category_get_all())

        for _ in range(count):
            # Добавляем случайный числовой суффикс, чтобы сразу получить уникальное имя
            name = f"{fake.word().capitalize()}{random.randint(1000, 9999)}"
            while name.lower() in existing:
                name = f"{fake.word().capitalize()}{random.randint(1000, 9999)}"

            description = fake.sentence()
            try:
                category_id = self.db.category_create(name=name, description=description)
                self.generated_data["categories"].append(category_id)
                existing.add(name.lower())
                print(f"Создана категория: name='{name}'")
            except Exception as e:
                print(f"Ошибка создания категории ({name}): {e}")

    def generate_news(self, count: int = 20):
        if not self.generated_data["users"]:
            raise RuntimeError("Сначала вызовите generate_users(), иначе новости не будут иметь автора.")
        if not self.generated_data["categories"]:
            raise RuntimeError("Сначала вызовите generate_categories(), иначе у новостей не будет категории.")

        statuses = ["Pending"]

        for _ in range(count):
            event_start = fake.date_time_between(start_date="-30d", end_date="+30d")
            event_end = event_start + timedelta(hours=random.randint(1, 72))

            news_data = {
                "title": fake.sentence(nb_words=6),
                "description": fake.text(max_nb_chars=500),
                "status": random.choice(statuses),
                "event_start": event_start.strftime("%Y-%m-%d %H:%M:%S"),
                "event_end": event_end.strftime("%Y-%m-%d %H:%M:%S"),
                "categoryID": random.choice(self.generated_data["categories"]),
            }

            user_id = random.choice(self.generated_data["users"])
            try:
                self.db.news_add(
                    user_id=user_id,
                    news_input_data=news_data,
                    files_received=False,
                    files_list=[],
                    files_folder=os.path.abspath("uploads")
                )
                print(f"Создана новость: title='{news_data['title']}' (author_id={user_id})")
            except Exception as e:
                print(f"Ошибка создания новости ('{news_data['title']}'): {e}")

    def close(self):
        self.db.close_connection()


if __name__ == "__main__":
    generator = TestDataGenerator()

    print("=== Генерация пользователей (10) ===")
    generator.generate_users(count=2)

    print("\n=== Генерация категорий (5) ===")
    generator.generate_categories(count=2)

    print("\n=== Генерация новостей (50) ===")
    generator.generate_news(count=50)

    generator.close()
