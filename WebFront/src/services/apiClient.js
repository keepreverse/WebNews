import { toast } from "react-toastify";

const API_URL = "http://127.0.0.1:5000/api";

// const API_URL = "https://webnews-1fwz .onrender.com/api";


let authToken = null;
let lastErrorMessage = "";

export const initAuthToken = () => {
  try {
    const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (user?.token) {
        authToken = user.token;
        api.setAuthToken(authToken);
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

export const resetErrorFlag = () => {
  lastErrorMessage = "";
};

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
    }

    const errorMessage =
      errorData.error || "Произошла ошибка при выполнении запроса";

    if (errorMessage !== lastErrorMessage) {
      toast.error(errorMessage);
      lastErrorMessage = errorMessage;
    }

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

  ping: async () => {
    try {
      const response = await fetch(`${API_URL}/ping`, {
        method: "GET",
        credentials: "include",
      });
      return response.ok;
    } catch (error) {
      console.error("Сервер недоступен:", error);
      return false;
    }
  },

  get: async (path) => {
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
