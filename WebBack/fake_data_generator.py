import random
from datetime import datetime, timedelta
from faker import Faker
from database.db import Storage  # Замените на ваш модуль

fake = Faker("ru_RU")  # Русская локализация

def generate_fake_users(count: int = 5):
    """Генерация тестовых пользователей"""
    db = Storage()
    db.open_connection()
    
    roles = ["Administrator", "Moderator", "Publisher"]
    
    for _ in range(count):
        user_data = {
            "login": fake.user_name(),
            "password": "test123",  # Пароль будет хешироваться
            "nick": fake.first_name(),
            "role": random.choice(roles)
        }
        
        try:
            db.user_create(
                login=user_data["login"],
                password=user_data["password"],
                nickname=user_data["nick"],
                role=user_data["role"]
            )
            print(f"Создан пользователь: {user_data['login']}")
        except Exception as e:
            print(f"Ошибка: {str(e)}")
    
    db.close_connection()

def generate_fake_news(count: int = 50):
    """Генерация тестовых новостей"""
    db = Storage()
    db.open_connection()
    
    users = db.user_get_all()
    if not users:
        raise Exception("Сначала создайте пользователей!")
    
    statuses = ["Pending", "Approved", "Rejected", "Archived"]
    
    for i in range(count):
        news_data = {
            "title": fake.sentence(nb_words=6),
            "description": fake.text(max_nb_chars=500),
            "status": random.choice(statuses),
            "event_start": fake.date_time_between(
                start_date="-30d", 
                end_date="now"
            ).strftime("%Y-%m-%d %H:%M:%S"),
            "event_end": fake.date_time_between(
                start_date="now", 
                end_date="+30d"
            ).strftime("%Y-%m-%d %H:%M:%S")
        }
        
        try:
            db.news_add(
                user_id=random.choice(users)["userID"],
                news_input_data=news_data,
                files_received=False,
                files_list=[],
                files_folder=""
            )
            print(f"Создана новость #{i+1}: {news_data['title']}")
        except Exception as e:
            print(f"Ошибка: {str(e)}")
    
    db.close_connection()

if __name__ == "__main__":
    generate_fake_users(50)  # Создаст 5 пользователей
    generate_fake_news(20)   # Создаст 150 новостей
    print("Тестовые данные успешно созданы!")



# import random
# from datetime import datetime, timedelta
# from faker import Faker
# from database.db import Storage  # Замените на ваш модуль

# fake = Faker("ru_RU")  # Русская локализация

# def generate_fake_users(count: int = 10):
#     """Генерация тестовых пользователей"""
#     db = Storage()
#     db.open_connection()
    
#     roles = ["Publisher"] * 8 + ["Moderator"] * 2  # 80% публикаторов, 20% модераторов
    
#     for _ in range(count):
#         user_data = {
#             "login": fake.user_name() + str(random.randint(100, 999)),
#             "password": "test123",
#             "nick": fake.first_name() + " " + fake.last_name(),
#             "role": random.choice(roles)
#         }
        
#         try:
#             db.user_create(
#                 login=user_data["login"],
#                 password=user_data["password"],
#                 nickname=user_data["nick"],
#                 role=user_data["role"]
#             )
#             print(f"Создан пользователь: {user_data['login']}")
#         except Exception as e:
#             print(f"Ошибка: {str(e)}")
    
#     db.close_connection()

# def generate_approved_news(count: int = 200):
#     """Генерация принятых новостей"""
#     db = Storage()
#     db.open_connection()
    
#     users = db.user_get_all()
#     if not users:
#         raise Exception("Сначала создайте пользователей!")
    
#     # Только публикаторы могут быть авторами новостей
#     publishers = [u for u in users if u["user_role"] == "Publisher"]
    
#     for i in range(count):
#         news_data = {
#             "title": fake.sentence(nb_words=8),
#             "description": fake.text(max_nb_chars=1000),
#             "status": "Approved",  # Фиксированный статус
#             "event_start": fake.date_time_between(
#                 start_date="-30d", 
#                 end_date="now"
#             ).strftime("%Y-%m-%d %H:%M:%S"),
#             "event_end": fake.date_time_between(
#                 start_date="now", 
#                 end_date="+60d"
#             ).strftime("%Y-%m-%d %H:%M:%S"),
#             "publish_date": fake.date_time_between(
#                 start_date="-7d",
#                 end_date="now"
#             ).strftime("%Y-%m-%d %H:%M:%S")
#         }
        
#         try:
#             db.news_add(
#                 user_id=random.choice(publishers)["userID"],
#                 news_input_data=news_data,
#                 files_received=False,
#                 files_list=[],
#                 files_folder=""
#             )
#             print(f"Создана новость {i+1}/200: {news_data['title']}")
#         except Exception as e:
#             print(f"Ошибка: {str(e)}")
    
#     db.close_connection()

# if __name__ == "__main__":
#     generate_fake_users(10)    # 10 пользователей
#     generate_approved_news(200) # 200 принятых новостей
#     print("Генерация данных завершена!")