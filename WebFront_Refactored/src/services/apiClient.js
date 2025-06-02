import { toast } from "react-toastify"; // чтобы выводить тосты

const API_URL = "http://127.0.0.1:5000/api";
//const API_URL = "https://webnews-1fwz.onrender.com/api";

let authToken = null;
let lastErrorMessage = ""; // хранит текст последнего показанного тоста

export const initAuthToken = () => {
  try {
    const userData =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (user?.token) {
        authToken = user.token;
      }
    }
  } catch (error) {
    console.error("Failed to initialize auth token:", error);
    clearAuthData();
  }
};

export const clearAuthData = () => {
  authToken = null;
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
};

// Явно сбрасывает последний показанный текст, если потребуется (например, вручную вызвать)
export const resetErrorFlag = () => {
  lastErrorMessage = "";
};

const handleResponse = async (response) => {
  if (!response.ok) {
    // Пытаемся распарсить JSON-ответ (если он есть)
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // если ответ не JSON — просто проигнорируем
    }

    // Собираем текст ошибки из ответа или ставим дефолтный
    const errorMessage =
      errorData.error || "Произошла ошибка при выполнении запроса";

    // Если новый текст ошибки не совпадает с последним показанным — показываем тост
    if (errorMessage !== lastErrorMessage) {
      toast.error(errorMessage);
      lastErrorMessage = errorMessage;
    }

    // Бросаем ошибку, чтобы вызывающий код мог её отловить
    switch (response.status) {
      case 401:
        throw new Error(errorMessage || "Неверный логин или пароль");
      case 403:
        throw new Error(errorMessage || "Доступ запрещен");
      case 404:
        throw new Error(errorMessage || "Ресурс не найден");
      case 409:
        throw new Error(errorMessage || "Конфликт данных");
      case 500:
        throw new Error(errorMessage || "Внутренняя ошибка сервера");
      default:
        throw new Error(errorMessage);
    }
  }

  // Если сервер вернул OK, но не вернул JSON (или вернул кривой) — бросим ошибку
  try {
    return await response.json();
  } catch {
    throw new Error("Ошибка при разборе ответа сервера");
  }
};

export const api = {
  setAuthToken: (token) => {
    authToken = token;
  },

  getAuthToken: () => authToken,

  get: async (path) => {
    // Перед каждым новым запросом сбрасываем lastErrorMessage,
    // чтобы пользователь вновь увидел ту же ошибку, если она повторится.
    lastErrorMessage = "";

    const headers = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    return await handleResponse(response);
  },

  post: async (path, data, isFormData = false) => {
    lastErrorMessage = "";

    const headers = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    // Если не FormData, ставим Content-Type
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const options = {
      method: "POST",
      headers,
      credentials: "include",
      body: isFormData ? data : JSON.stringify(data),
    };

    const response = await fetch(`${API_URL}${path}`, options);
    return await handleResponse(response);
  },

  put: async (path, data, isFormData = false) => {
    lastErrorMessage = "";

    const headers = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const options = {
      method: "PUT",
      headers,
      credentials: "include",
      body: isFormData ? data : JSON.stringify(data),
    };

    const response = await fetch(`${API_URL}${path}`, options);
    return await handleResponse(response);
  },

  delete: async (path) => {
    lastErrorMessage = "";

    const headers = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    return await handleResponse(response);
  },
};
