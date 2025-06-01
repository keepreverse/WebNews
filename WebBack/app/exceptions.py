from http import HTTPStatus
from flask import current_app

class AppError(Exception):
    """Базовый класс для всех исключений приложения"""
    def __init__(
        self,
        message: str,
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR,
        error_type: str = "server_error",
        details: dict = None,
        loggable: bool = True
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        self.details = details or {}
        self.loggable = loggable

    def to_dict(self):
        payload = {
            "error": self.message,
            "type": self.error_type,
            "status": self.status_code,
        }
        # Включаем детали только в режиме DEBUG
        if current_app.config.get("DEBUG") and self.details:
            payload["details"] = self.details
        return payload


# === АВТОРИЗАЦИЯ ===
class AuthError(AppError):
    def __init__(self, message: str = "Требуется аутентификация"):
        super().__init__(message=message, status_code=HTTPStatus.UNAUTHORIZED, error_type="auth_error")

class InvalidTokenError(AuthError):
    def __init__(self, message: str = "Неверный или просроченный токен"):
        super().__init__(message=message)

class PermissionDeniedError(AppError):
    def __init__(self, message: str = "Недостаточно прав"):
        super().__init__(message=message, status_code=HTTPStatus.FORBIDDEN, error_type="permission_denied")


# === ВАЛИДАЦИЯ ===
class ValidationError(AppError):
    def __init__(self, message: str = "Ошибка валидации", details: dict = None):
        super().__init__(message=message, status_code=HTTPStatus.BAD_REQUEST, error_type="validation_error", details=details)

class FileValidationError(ValidationError):
    def __init__(self, message: str, file_info: dict = None):
        super().__init__(message=message, details={"file": file_info} if file_info else None)


# === БАЗА ДАННЫХ ===
class DatabaseError(AppError):
    def __init__(
        self, 
        message: str = "Ошибка работы с базой данных", 
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR,  # добавить
        details: dict = None
    ):
        super().__init__(
            message=message, 
            status_code=status_code,
            error_type="database_error", 
            details=details
        )

class NotFoundError(DatabaseError):
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} с ID={resource_id} не найден(а)",
            status_code=HTTPStatus.NOT_FOUND,
            details={"resource_id": resource_id}
        )

class ConstraintError(DatabaseError):
    def __init__(self, message: str = "Нарушено ограничение целостности данных", constraint: str = None):
        super().__init__(message=message, status_code=HTTPStatus.CONFLICT, details={"constraint": constraint} if constraint else None)


# === БИЗНЕС-ЛОГИКА ===
class BusinessRuleError(AppError):
    def __init__(self, message: str, error_code: str):
        super().__init__(message=message, status_code=HTTPStatus.UNPROCESSABLE_ENTITY, error_type="business_rule_violation", details={"error_code": error_code})


# === ФАЙЛОВАЯ СИСТЕМА ===
class FileSystemError(AppError):
    def __init__(self, message: str = "Ошибка файловой системы", file_path: str = None):
        super().__init__(message=message, status_code=HTTPStatus.SERVICE_UNAVAILABLE, error_type="file_system_error", details={"file_path": file_path} if file_path else None)