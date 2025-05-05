import { jwtDecode } from 'jwt-decode';

export const decodeJWT = (token) => {
  try {
    return jwtDecode(token);
  } catch (e) {
    console.error('Invalid token:', e);
    return null;
  }
};

export const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    return Date.now() < exp * 1000;
  } catch {
    return false;
  }
};