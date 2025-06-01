const API_URL = "https://webnews-1fwz.onrender.com/api";
let authToken = null;

export const initAuthToken = () => {
  try {
    const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
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

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {}

    switch (response.status) {
      case 401:
        throw new Error(errorData.error || "Неверный логин или пароль");
      case 403:
        throw new Error(errorData.error || "Доступ запрещен");
      case 404:
        throw new Error(errorData.error || "Ресурс не найден");
      case 409:
        throw new Error(errorData.error || "Конфликт данных");
      case 500:
        throw new Error(errorData.error || "Внутренняя ошибка сервера");
      default:
        throw new Error(errorData.error || "Произошла ошибка при запросе");
    }
  }

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
    const headers = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const options = {
      method: "POST",
      headers,
      credentials: "include",
      body: isFormData ? data : JSON.stringify(data),
    };

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${path}`, options);
    return await handleResponse(response);
  },

  put: async (path, data, isFormData = false) => {
    const headers = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const options = {
      method: "PUT",
      headers,
      credentials: "include",
      body: isFormData ? data : JSON.stringify(data),
    };

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${path}`, options);
    return await handleResponse(response);
  },

  delete: async (path) => {
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
