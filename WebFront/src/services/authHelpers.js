import { jwtDecode } from "jwt-decode";
import { api } from "./apiClient";

export const isAdmin = (user) => user?.role === 'Administrator';
export const isModerator = (user) => user?.role === 'Moderator';
export const isPublisher = (user) => user?.role === 'Publisher';

export function getAuthToken() {
  const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!userData) return null;

  const user = JSON.parse(userData);
  const token = user?.token || null;

  if (token) {
    api.setAuthToken(token);
  }

  return token;
}

export function isTokenValid(token) {
  if (!token) return false;

  try {
    const { exp } = jwtDecode(token);
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
}

export function isAuthenticated() {
  const token = getAuthToken();
  return token && isTokenValid(token);
}