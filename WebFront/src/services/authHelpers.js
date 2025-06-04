import { jwtDecode } from "jwt-decode";
import { api } from "./apiClient"; // добавлено

export const isAdmin = (user) => user?.role === 'Administrator';
export const isModerator = (user) => user?.role === 'Moderator';
export const isPublisher = (user) => user?.role === 'Publisher';

// Получение токена из объекта user
export function getAuthToken() {
  const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!userData) return null;

  const user = JSON.parse(userData);
  const token = user?.token || null;

  if (token) {
    api.setAuthToken(token); // синхронизация токена
  }

  return token;
}

// Проверка валидности токена
export function isTokenValid(token) {
  if (!token) return false;

  try {
    const { exp } = jwtDecode(token);
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

// Проверка авторизации
export function isAuthenticated() {
  const token = getAuthToken();
  return token && isTokenValid(token);
}


