const API_URL = 'http://127.0.0.1:5000';
let authToken = null;

// Инициализация токена при загрузке модуля
export const initAuthToken = () => {
  try {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user?.token) {
        authToken = user.token;
      }
    }
  } catch (error) {
    console.error('Failed to initialize auth token:', error);
    clearAuthData();
  }
};

// Очистка данных аутентификации
export const clearAuthData = () => {
  authToken = null;
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
};

// Обработчик ответов сервера
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Ошибка при чтении тела ответа
    }

    switch (response.status) {
      case 401:
        throw new Error(errorData.message || 'Неверный логин или пароль');
      case 403:
        throw new Error(errorData.message || 'Доступ запрещен. Недостаточно прав.');
      case 404:
        throw new Error(errorData.message || 'Ресурс не найден.');
      case 500:
        throw new Error(errorData.message || 'Внутренняя ошибка сервера.');
      default:
        throw new Error(errorData.message || errorData.DESCRIPTION || 'Произошла ошибка при выполнении запроса.');
    }
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('Не удалось обработать ответ сервера.');
  }
};

// Основной API клиент
export const api = {
  setAuthToken: (token) => {
    authToken = token;
  },

  getAuthToken: () => {
    return authToken;
  },

  get: async (path) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      headers,
      credentials: 'include'
    });

    return await handleResponse(response);
  },

  post: async (path, data, isFormData = false) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include'
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${path}`, options);
    return await handleResponse(response);
  },

  put: async (path, data, isFormData = false) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      method: 'PUT',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include'
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${path}`, options);
    return await handleResponse(response);
  },

  delete: async (path) => {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });

    return await handleResponse(response);
  }
};
