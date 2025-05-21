import os

# Структура для создания
structure = {
    "src/components/Admin": [
        ("UsersManagement", [
            "UsersManagement.js",
            "UsersFilters.js",
            "UserEditForm.js"
        ]),
        ("NewsModeration", [
            "NewsModeration.js",
            "NewsFilters.js",
            "NewsGallery.js"
        ]),
        "Pagination.js"
    ]
}

def create_structure(base_path, structure):
    for path, content in structure.items():
        full_path = os.path.join(base_path, path)
        
        # Создаем родительскую директорию
        os.makedirs(full_path, exist_ok=True)
        
        for item in content:
            if isinstance(item, tuple):
                # Это директория с содержимым
                dir_name, files = item
                dir_path = os.path.join(full_path, dir_name)
                os.makedirs(dir_path, exist_ok=True)
                for file in files:
                    open(os.path.join(dir_path, file), 'a').close()
            else:
                # Это файл
                open(os.path.join(full_path, item), 'a').close()

if __name__ == "__main__":
    base_dir = os.getcwd()  # Текущая директория
    create_structure(base_dir, structure)
    print("Структура файлов успешно создана!")