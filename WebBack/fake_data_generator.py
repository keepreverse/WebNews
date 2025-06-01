
import random
import os
from datetime import datetime, timedelta
from faker import Faker
from database.db import Storage

fake = Faker("ru_RU")

class TestDataGenerator:
    def __init__(self):
        self.db = Storage()
        self.db.open_connection()
        self.generated_data = {
            'users': [],
            'news': [],
            'categories': []
        }

    def generate_users(self, count=5):
        roles = ["Administrator", "Moderator", "Publisher"]
        existing = set()
        current_users = self.db.user_get_all()
        existing.update((u['login'].lower(), u['nick'].lower()) for u in current_users)

        for _ in range(count):
            while True:
                login = f"{fake.user_name()}{random.randint(1000,9999)}"
                nick = f"{fake.first_name()}{random.randint(1000,9999)}"
                if (login.lower(), nick.lower()) not in existing:
                    break

            user_data = {
                "login": login,
                "password": fake.password(length=12),
                "nick": nick,
                "role": random.choice(roles)
            }

            try:
                user_id = self.db.user_create(
                    login=user_data["login"],
                    password=user_data["password"],
                    nickname=user_data["nick"],
                    role=user_data["role"]
                )
                self.generated_data['users'].append(user_id)
                print(f"Создан пользователь: {user_data['login']}")
                existing.add((login.lower(), nick.lower()))
            except Exception as e:
                print(f"Ошибка создания пользователя: {str(e)}")

    def generate_categories(self, count=5):
        existing = set(c['name'].lower() for c in self.db.category_get_all())
        for _ in range(count):
            name = fake.unique.word().capitalize()
            while name.lower() in existing:
                name = fake.unique.word().capitalize()

            try:
                category_id = self.db.category_create(
                    name=name,
                    description=fake.sentence()
                )
                self.generated_data['categories'].append(category_id)
                print(f"Создана категория: {name}")
                existing.add(name.lower())
            except Exception as e:
                print(f"Ошибка создания категории: {str(e)}")

    def generate_news(self, count=20):
        if not self.generated_data['users']:
            raise Exception("Требуются пользователи для создания новостей")
        statuses = ["Pending", "Approved", "Rejected", "Archived"]
        for _ in range(count):
            try:
                event_start = fake.date_time_between("-30d", "+30d")
                event_end = event_start + timedelta(hours=random.randint(1, 72))
                news_data = {
                    "title": fake.sentence(nb_words=6),
                    "description": fake.text(max_nb_chars=500),
                    "status": random.choice(statuses),
                    "event_start": event_start.strftime("%Y-%m-%d %H:%M:%S"),
                    "event_end": event_end.strftime("%Y-%m-%d %H:%M:%S"),
                    "categoryID": random.choice(self.generated_data['categories']) if self.generated_data['categories'] else None
                }
                user_id = random.choice(self.generated_data['users'])
                self.db.news_add(
                    user_id=user_id,
                    news_input_data=news_data,
                    files_received=False,
                    files_list=[],
                    files_folder=os.path.abspath("uploads")
                )
                print(f"Создана новость: {news_data['title']}")
            except Exception as e:
                print(f"Ошибка создания новости: {str(e)}")

if __name__ == "__main__":
    generator = TestDataGenerator()
    print("=== Генерация пользователей ===")
    generator.generate_users(27)
    print("=== Генерация категорий ===")
    generator.generate_categories(525)
    print("=== Генерация новостей ===")
    generator.generate_news(1445)
