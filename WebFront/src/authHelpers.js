import { isTokenValid } from './utils/jwt';

export const isAdmin = (user) => user?.role === 'Administrator';
export const isModerator = (user) => user?.role === 'Moderator';
export const isPublisher = (user) => user?.role === 'Publisher';

export const canEditNews = (user, newsAuthorId) => {
  return isAdmin(user) || (isModerator(user) && user.id === newsAuthorId);
};

export const canDeleteNews = (user) => isAdmin(user);

export const isAuthenticated = () => {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
  return user && user.token;
};

export const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
  return user?.token;
};

export const checkAuth = () => {
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
  if (!user?.token) {
    return false;
  }
  return isTokenValid(user.token);
};