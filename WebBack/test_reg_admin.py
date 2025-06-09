import requests
import json

url = 'http://127.0.0.1:5000/api/auth/register'
data = {
    "login": "hacker_user",
    "password": "hacker_pass",
    "nickname": "Я_Хакер",
    "user_role": "Administrator"  # Пытаемся передать лишнее поле
}

resp = requests.post(url, json=data)
print("Статус:", resp.status_code)

try:
    resp_json = resp.json()
    print("Ответ:", json.dumps(resp_json, ensure_ascii=False, indent=2))
except Exception:
    print("Ответ:", resp.text)
