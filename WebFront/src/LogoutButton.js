import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { api } from './apiClient';

function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout', {}); // Пустой объект в качестве тела запроса
      
      localStorage.removeItem('user');
      sessionStorage.removeItem('user'); // Добавьте очистку sessionStorage для полноты
      api.setAuthToken(null); // Очищаем токен в apiClient
      
      toast.success('Вы успешно вышли из системы');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Ошибка при выходе из системы');
    }
  };

  return (
    <button onClick={handleLogout} className="custom_button" id="logout">
      Сменить пользователя
    </button>
  );
}

export default LogoutButton;